import { getOrderReceipt, type OrderReceipt } from '@/src/services/cashier-api';
import type { PosStation } from '@/src/services/stations-api';
import {
  loadPrinterConfig,
  PrinterNotConfiguredError,
  sendToPrinter,
  type PrinterConfig,
} from './bluetooth-printer';
import { renderReceiptImages, renderTestImages } from './print-images';
import { buildRasterPayload } from './raster';
import { buildReceiptPayload, buildTestPayload } from './receipt-layout';

/** Nghỉ giữa các gói khi gửi ảnh; tăng nếu máy in bị mất dòng hoặc in lỗi. */
const IMAGE_CHUNK_DELAY_MS = 20;

type Payload = { data: string; chunkDelayMs: number };

/**
 * Máy in dùng cho quầy hiện tại: ưu tiên máy đã chọn trên thiết bị này; nếu chưa chọn thì dùng địa chỉ
 * Bluetooth mà Quản lý cấu hình cho quầy (mặc định in ảnh).
 */
async function resolvePrinter(station: PosStation | null): Promise<PrinterConfig> {
  const saved = await loadPrinterConfig();
  if (saved) return saved;
  if (station?.printerConnection === 'BLUETOOTH' && station.printerAddress) {
    return { address: station.printerAddress, name: station.printerAddress, printMode: 'image' };
  }
  throw new PrinterNotConfiguredError('Chưa chọn máy in. Vào Tài khoản > Máy in hóa đơn để chọn.');
}

/** Dựng ảnh nếu được chọn; nếu không dựng được thì in chữ không dấu để bill vẫn ra giấy. */
async function buildPayload(receipt: OrderReceipt, mode: PrinterConfig['printMode']): Promise<Payload> {
  if (mode === 'image') {
    try {
      return { data: buildRasterPayload(await renderReceiptImages(receipt)), chunkDelayMs: IMAGE_CHUNK_DELAY_MS };
    } catch (failure) {
      console.warn('Không dựng được ảnh bill, chuyển sang in chữ không dấu:', failure);
    }
  }
  return { data: buildReceiptPayload(receipt), chunkDelayMs: 0 };
}

async function print(printer: PrinterConfig, receipt: OrderReceipt) {
  const { data, chunkDelayMs } = await buildPayload(receipt, printer.printMode);
  await sendToPrinter(printer.address, data, chunkDelayMs);
}

/** In bill + phiếu số gọi từ dữ liệu receipt có sẵn (dùng cho in lại). */
export async function printReceipt(receipt: OrderReceipt, station: PosStation | null) {
  await print(await resolvePrinter(station), receipt);
}

/** Lấy receipt từ backend rồi in. */
export async function printOrderReceipt(orderId: string, station: PosStation | null) {
  const printer = await resolvePrinter(station);
  await print(printer, await getOrderReceipt(orderId));
}

/** Phiếu in thử theo đúng chế độ đang chọn; ở chế độ ảnh, lỗi dựng ảnh được báo lên để biết mà sửa. */
export async function printTestPage(printer: Pick<PrinterConfig, 'address' | 'printMode'>) {
  if (printer.printMode === 'image') {
    await sendToPrinter(printer.address, buildRasterPayload(await renderTestImages()), IMAGE_CHUNK_DELAY_MS);
    return;
  }
  await sendToPrinter(printer.address, buildTestPayload());
}
