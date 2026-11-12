import { ApiError } from '@/src/services/auth-types';
import {
  getCashRefundReceipt,
  getOrderReceipt,
  getReceiptPrintImage,
  getRefundPrintImage,
  listPrintJobs,
  reportPrintResult,
  reportRefundPrintResult,
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
import {
  buildReceiptPayload,
  buildRefundPayload,
  buildTestPayload,
  type RefundSlipHeader,
} from './receipt-layout';

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

/**
 * Chế độ ảnh: ưu tiên in đúng file PDF đã lưu ở backend (ảnh render từ chính PDF, một tờ đã gồm số gọi và QR) để bản
 * in và bản lưu thống nhất. Không lấy được (PDF tắt/chưa tạo được, mạng chậm...) thì dựng bill + phiếu số cục bộ; vẫn
 * không dựng được thì in chữ không dấu — bill luôn ra giấy (BR-21). Chế độ chữ giữ nguyên vì là lựa chọn riêng của máy in.
 */
async function buildPayload(receipt: OrderReceipt, mode: PrinterConfig['printMode']): Promise<Payload> {
  if (mode === 'image') {
    try {
      const pdfImage = await getReceiptPrintImage(receipt.orderId);
      return { data: buildRasterPayload([pdfImage]), chunkDelayMs: IMAGE_CHUNK_DELAY_MS };
    } catch (failure) {
      console.warn('Không lấy được ảnh bill từ PDF của máy chủ, in bill dựng cục bộ:', failure);
    }
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

/** Một lần in phiếu hoàn; `printLogId` là lượt in backend đã ghi nhận (thiếu thì không báo kết quả được). */
export type RefundSlipPrintJob = {
  orderId: string;
  refundId: string;
  /** Chỉ dùng khi phải in bản chữ dự phòng (không lấy được ảnh từ PDF hoặc máy in đang ở chế độ chữ). */
  header: RefundSlipHeader;
  printLogId?: string;
};

const REFUND_IMAGE_ATTEMPTS = 3;
const REFUND_IMAGE_RETRY_MS = 1_500;

/**
 * Ảnh in render từ PDF phiếu hoàn đã lưu. Ngay sau khi hoàn tiền PDF có thể còn đang tạo (404/409) nên thử lại vài
 * lần; lỗi khác (hết thời gian, mạng...) thì bỏ luôn để in bản chữ dự phòng.
 */
async function refundPdfImage(orderId: string, refundId: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getRefundPrintImage(orderId, refundId);
    } catch (failure) {
      const pending = failure instanceof ApiError && (failure.status === 404 || failure.status === 409);
      if (!pending || attempt >= REFUND_IMAGE_ATTEMPTS) throw failure;
      await new Promise((resolve) => setTimeout(resolve, REFUND_IMAGE_RETRY_MS));
    }
  }
}

/** Phiếu chữ không dấu dựng từ dữ liệu cố định của lượt hoàn — chỉ dùng khi không in được từ PDF. */
async function refundTextPayload(job: RefundSlipPrintJob): Promise<Payload> {
  const refund = await getCashRefundReceipt(job.orderId, job.refundId);
  let header = job.header;
  if (!header.branchName) {
    // bill của đơn chưa tải được ở màn chi tiết: lấy lại để phiếu có tên quán / chi nhánh
    const receipt = await getOrderReceipt(job.orderId).catch(() => null);
    if (receipt) header = { ...header, sellerName: receipt.seller.name, branchName: receipt.seller.branchName };
  }
  return { data: buildRefundPayload(refund, header), chunkDelayMs: 0 };
}

/**
 * In phiếu hoàn tiền từ chính PDF backend đã lưu cho lượt hoàn (ảnh render từ PDF) để bản in khớp bản lưu. Không lấy
 * được ảnh (PDF tắt/lỗi, mạng chậm...) hoặc máy in ở chế độ chữ thì in bản chữ để khách vẫn có phiếu ký nhận.
 * Kết quả in thật được báo về lượt in `printLogId`; lỗi được ném lại để UI cho thử lại.
 */
export async function printRefundSlip(job: RefundSlipPrintJob, station: PosStation | null) {
  let failure: unknown;
  try {
    const printer = await resolvePrinter(station);
    let payload: Payload | null = null;
    if (printer.printMode === 'image') {
      try {
        payload = {
          data: buildRasterPayload([await refundPdfImage(job.orderId, job.refundId)]),
          chunkDelayMs: IMAGE_CHUNK_DELAY_MS,
        };
      } catch (reason) {
        console.warn('Không lấy được ảnh phiếu hoàn từ PDF của máy chủ, in bản chữ:', reason);
      }
    }
    payload ??= await refundTextPayload(job);
    await sendToPrinter(printer.address, payload.data, payload.chunkDelayMs);
  } catch (reason) {
    failure = reason ?? 'Không in được';
  }
  if (job.printLogId) {
    const message = failure instanceof Error ? failure.message : String(failure ?? '');
    await (failure === undefined
      ? reportRefundPrintResult(job.printLogId, 'PRINTED')
      : reportRefundPrintResult(job.printLogId, 'FAILED', message)
    ).catch((reason) => console.warn('Không báo được kết quả in phiếu hoàn về máy chủ:', reason));
  }
  if (failure !== undefined) throw failure;
}

/** Phiếu in thử theo đúng chế độ đang chọn; ở chế độ ảnh, lỗi dựng ảnh được báo lên để biết mà sửa. */
export async function printTestPage(printer: Pick<PrinterConfig, 'address' | 'printMode'>) {
  if (printer.printMode === 'image') {
    await sendToPrinter(printer.address, buildRasterPayload(await renderTestImages()), IMAGE_CHUNK_DELAY_MS);
    return;
  }
  await sendToPrinter(printer.address, buildTestPayload());
}
