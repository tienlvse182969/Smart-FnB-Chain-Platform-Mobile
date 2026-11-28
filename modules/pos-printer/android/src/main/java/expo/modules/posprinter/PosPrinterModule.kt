package expo.modules.posprinter

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.InnerResultCallback
import com.sunmi.peripheral.printer.SunmiPrinterService
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Lỗi có mã để phía JS phân loại và hiển thị hướng dẫn đúng cho thu ngân. */
class PrinterException(code: String, message: String) : CodedException(code, message, null)

/**
 * Gửi dữ liệu ESC/POS thô tới máy in không đi qua Bluetooth:
 *  - USB host: máy in cắm dây vào cổng USB của máy POS (kể cả máy in tích hợp nối USB bên trong).
 *  - Máy in tích hợp của Sunmi: qua dịch vụ in có sẵn của máy (`sendRAWData`).
 * Dữ liệu truyền từ JS dạng base64 (chuỗi nhị phân của bộ dựng ESC/POS).
 */
class PosPrinterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val usbManager: UsbManager
    get() = context.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    Name("PosPrinter")

    // ---- USB ----

    AsyncFunction("listUsbDevices") {
      usbManager.deviceList.values.mapNotNull { device ->
        val match = findBulkOut(device) ?: return@mapNotNull null
        mapOf(
          "id" to deviceId(device),
          "name" to deviceName(device),
          "isPrinterClass" to (match.first.interfaceClass == UsbConstants.USB_CLASS_PRINTER),
        )
      }.sortedByDescending { it["isPrinterClass"] as Boolean }
    }

    // Xin quyền sớm (khi chọn máy in) để lúc in không bị hộp thoại chen ngang.
    AsyncFunction("requestUsbPermission") { id: String ->
      ensurePermission(findDevice(id))
      true
    }

    AsyncFunction("writeUsb") { id: String, base64: String ->
      val device = findDevice(id)
      ensurePermission(device)
      val (intf, out) = findBulkOut(device)
        ?: throw PrinterException("ERR_USB_NO_ENDPOINT", "Thiết bị USB không có cổng ghi dữ liệu của máy in.")
      val connection = usbManager.openDevice(device)
        ?: throw PrinterException("ERR_USB_IO", "Không mở được thiết bị USB.")
      try {
        if (!connection.claimInterface(intf, true)) {
          throw PrinterException("ERR_USB_IO", "Không chiếm được cổng giao tiếp của máy in USB.")
        }
        val data = Base64.decode(base64, Base64.DEFAULT)
        var offset = 0
        while (offset < data.size) {
          val length = minOf(USB_CHUNK, data.size - offset)
          val sent = connection.bulkTransfer(out, data, offset, length, USB_TIMEOUT_MS)
          if (sent <= 0) throw PrinterException("ERR_USB_IO", "Máy in USB không nhận dữ liệu.")
          offset += sent
        }
      } finally {
        runCatching { connection.releaseInterface(intf) }
        connection.close()
      }
    }

    // ---- Máy in tích hợp (Sunmi) ----

    // Trả về tên model nếu máy có máy in tích hợp dùng được, ngược lại null.
    AsyncFunction("getBuiltInPrinter") {
      try {
        sunmiService().printerModal ?: "Sunmi"
      } catch (_: PrinterException) {
        null
      } catch (_: Exception) {
        resetSunmi()
        null
      }
    }

    AsyncFunction("writeBuiltIn") { base64: String ->
      val data = Base64.decode(base64, Base64.DEFAULT)
      try {
        val service = sunmiService()
        checkSunmiState(service.updatePrinterState())
        var offset = 0
        while (offset < data.size) {
          val end = minOf(offset + SUNMI_CHUNK, data.size)
          sendSunmiChunk(service, data.copyOfRange(offset, end))
          offset = end
        }
      } catch (error: PrinterException) {
        throw error
      } catch (error: Exception) {
        resetSunmi()
        throw PrinterException("ERR_BUILTIN_UNAVAILABLE", error.message ?: "Không gửi được dữ liệu tới máy in tích hợp.")
      }
    }

    OnDestroy { resetSunmi() }
  }

  // ---- USB helpers ----

  private fun deviceId(device: UsbDevice) = "${device.vendorId}:${device.productId}"

  private fun deviceName(device: UsbDevice): String {
    // Từ Android 10 đọc tên sản phẩm có thể cần quyền; không đọc được thì dùng mã VID:PID.
    val name = runCatching { device.productName }.getOrNull()?.takeIf { it.isNotBlank() }
    return name ?: "USB %04X:%04X".format(device.vendorId, device.productId)
  }

  private fun findDevice(id: String): UsbDevice =
    usbManager.deviceList.values.firstOrNull { deviceId(it) == id }
      ?: throw PrinterException("ERR_USB_NO_DEVICE", "Không thấy máy in USB. Hãy kiểm tra dây cắm.")

  /** Giao diện + cổng ghi (bulk OUT) của máy in; ưu tiên interface class Printer, sau đó tới vendor-specific. */
  private fun findBulkOut(device: UsbDevice): Pair<UsbInterface, UsbEndpoint>? {
    var fallback: Pair<UsbInterface, UsbEndpoint>? = null
    for (i in 0 until device.interfaceCount) {
      val intf = device.getInterface(i)
      var out: UsbEndpoint? = null
      for (e in 0 until intf.endpointCount) {
        val endpoint = intf.getEndpoint(e)
        if (endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK && endpoint.direction == UsbConstants.USB_DIR_OUT) {
          out = endpoint
          break
        }
      }
      if (out == null) continue
      if (intf.interfaceClass == UsbConstants.USB_CLASS_PRINTER) return intf to out
      if (intf.interfaceClass == UsbConstants.USB_CLASS_VENDOR_SPEC && fallback == null) fallback = intf to out
    }
    return fallback
  }

  /** Chặn tới khi người dùng trả lời hộp thoại cấp quyền USB của hệ thống (chạy trên luồng nền, không chặn JS). */
  private fun ensurePermission(device: UsbDevice) {
    val manager = usbManager
    if (manager.hasPermission(device)) return

    val action = "${context.packageName}.USB_PRINTER_PERMISSION"
    val latch = CountDownLatch(1)
    val granted = AtomicBoolean(false)
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context, intent: Intent) {
        granted.set(intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false))
        latch.countDown()
      }
    }
    val filter = IntentFilter(action)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      context.registerReceiver(receiver, filter)
    }
    try {
      // Hệ thống điền thêm dữ liệu vào intent nên PendingIntent phải mutable (Android 12+).
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
      val pending = PendingIntent.getBroadcast(context, 0, Intent(action).setPackage(context.packageName), flags)
      manager.requestPermission(device, pending)
      latch.await(PERMISSION_TIMEOUT_S, TimeUnit.SECONDS)
    } finally {
      runCatching { context.unregisterReceiver(receiver) }
    }
    if (!granted.get() && !manager.hasPermission(device)) {
      throw PrinterException("ERR_USB_PERMISSION", "Chưa cấp quyền dùng máy in USB cho ứng dụng.")
    }
  }

  // ---- Sunmi helpers ----

  @Volatile private var sunmi: SunmiPrinterService? = null
  @Volatile private var bindLatch: CountDownLatch? = null

  private val sunmiCallback = object : InnerPrinterCallback() {
    override fun onConnected(service: SunmiPrinterService) {
      sunmi = service
      bindLatch?.countDown()
    }

    override fun onDisconnected() {
      sunmi = null
    }
  }

  @Synchronized
  private fun sunmiService(): SunmiPrinterService {
    sunmi?.let { return it }
    val latch = CountDownLatch(1)
    bindLatch = latch
    val bound = try {
      InnerPrinterManager.getInstance().bindService(context, sunmiCallback)
    } catch (_: Exception) {
      false
    }
    if (!bound || !latch.await(BIND_TIMEOUT_S, TimeUnit.SECONDS)) {
      throw PrinterException("ERR_BUILTIN_UNAVAILABLE", "Thiết bị này không có máy in tích hợp được hỗ trợ.")
    }
    return sunmi ?: throw PrinterException("ERR_BUILTIN_UNAVAILABLE", "Không kết nối được máy in tích hợp.")
  }

  @Synchronized
  private fun resetSunmi() {
    if (sunmi == null) return
    runCatching { InnerPrinterManager.getInstance().unBindService(context, sunmiCallback) }
    sunmi = null
  }

  /** Mã trạng thái của `updatePrinterState()`: 1 bình thường, 2 đang khởi động, 4 hết giấy, 5 quá nhiệt, 6 mở nắp... */
  private fun checkSunmiState(state: Int) {
    when (state) {
      1, 2, 8, 9 -> Unit
      4 -> throw PrinterException("ERR_BUILTIN_PAPER", "Máy in tích hợp hết giấy.")
      6 -> throw PrinterException("ERR_BUILTIN_COVER", "Nắp máy in tích hợp đang mở.")
      5 -> throw PrinterException("ERR_BUILTIN_STATE", "Máy in tích hợp đang quá nhiệt, hãy đợi nguội rồi in lại.")
      else -> throw PrinterException("ERR_BUILTIN_STATE", "Máy in tích hợp đang lỗi (mã $state).")
    }
  }

  private fun sendSunmiChunk(service: SunmiPrinterService, chunk: ByteArray) {
    val latch = CountDownLatch(1)
    val success = AtomicBoolean(false)
    service.sendRAWData(chunk, object : InnerResultCallback() {
      override fun onRunResult(isSuccess: Boolean) {
        success.set(isSuccess)
        latch.countDown()
      }

      override fun onReturnString(result: String?) = Unit

      override fun onRaiseException(code: Int, msg: String?) {
        latch.countDown()
      }

      override fun onPrintResult(code: Int, msg: String?) = Unit
    })
    if (!latch.await(SUNMI_TIMEOUT_S, TimeUnit.SECONDS) || !success.get()) {
      throw PrinterException("ERR_BUILTIN_STATE", "Máy in tích hợp không in được.")
    }
  }

  private companion object {
    const val USB_CHUNK = 16 * 1024
    const val USB_TIMEOUT_MS = 15_000
    const val PERMISSION_TIMEOUT_S = 60L
    const val BIND_TIMEOUT_S = 3L
    const val SUNMI_CHUNK = 128 * 1024
    const val SUNMI_TIMEOUT_S = 30L
  }
}
