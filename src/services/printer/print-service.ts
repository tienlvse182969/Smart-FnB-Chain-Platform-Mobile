import {
  getOrderReceipt,
  listPrintJobs,
  reportPrintResult,
  type OrderReceipt,
} from '@/src/services/cashier-api';
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

/** Báo kết quả in thật cho backend; lỗi báo cáo không được làm đổi kết quả in vật lý (BR-21). */
async function reportJobs(jobIds: string[], failure?: unknown) {
  const message = failure instanceof Error ? failure.message : String(failure);
  await Promise.all(
    jobIds.map((id) =>
      (failure === undefined
        ? reportPrintResult(id, 'PRINTED')
        : reportPrintResult(id, 'FAILED', message)
      ).catch((reason) => console.warn('Không báo được kết quả in về máy chủ:', reason)),
    ),
  );
}

/** Job cần báo cho lượt in đầu của đơn (PayOS không trả `printJobs`); gồm cả FAILED để in lại dùng đúng job cũ. */
async function openPrintJobIds(orderId: string): Promise<string[]> {
  try {
    const jobs = await listPrintJobs(orderId);
    return jobs
      .filter((job) => !job.isReprint && (job.status === 'PENDING' || job.status === 'FAILED'))
      .map((job) => job.id);
  } catch (reason) {
    console.warn('Không lấy được danh sách lượt in:', reason);
    return [];
  }
}

/** Chạy lệnh in rồi báo PRINTED/FAILED cho từng job; lỗi vẫn được ném lại để UI xử lý như trước. */
async function printAndReport(jobIds: string[], run: () => Promise<void>) {
  try {
    await run();
  } catch (failure) {
    await reportJobs(jobIds, failure ?? 'Không in được');
    throw failure;
  }
  await reportJobs(jobIds);
}

/** In bill + phiếu số gọi từ dữ liệu receipt có sẵn (dùng cho in lại); `jobIds` là các PrintJob backend đã tạo. */
export async function printReceipt(receipt: OrderReceipt, station: PosStation | null, jobIds: string[] = []) {
  await printAndReport(jobIds, async () => print(await resolvePrinter(station), receipt));
}

/** Lấy receipt từ backend rồi in; không truyền `jobIds` thì tự tìm job đang chờ của đơn. */
export async function printOrderReceipt(orderId: string, station: PosStation | null, jobIds?: string[]) {
  const ids = jobIds ?? (await openPrintJobIds(orderId));
  await printAndReport(ids, async () => {
    const printer = await resolvePrinter(station);
    await print(printer, await getOrderReceipt(orderId));
  });
}

/** Phiếu in thử theo đúng chế độ đang chọn; ở chế độ ảnh, lỗi dựng ảnh được báo lên để biết mà sửa. */
export async function printTestPage(printer: Pick<PrinterConfig, 'address' | 'printMode'>) {
  if (printer.printMode === 'image') {
    await sendToPrinter(printer.address, buildRasterPayload(await renderTestImages()), IMAGE_CHUNK_DELAY_MS);
    return;
  }
  await sendToPrinter(printer.address, buildTestPayload());
}
