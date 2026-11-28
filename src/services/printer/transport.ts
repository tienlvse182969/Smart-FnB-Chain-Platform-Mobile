import { listPairedPrinters, sendViaBluetooth } from './bluetooth-transport';
import { listUsbPrinters, sendViaBuiltIn, sendViaUsb } from './native-transport';
import type { PrinterConfig, PrinterDevice, PrinterTransport } from './printer-core';

/** Danh sách máy in chọn được theo cách nối (Bluetooth đã ghép đôi / thiết bị USB đang cắm). */
export function listPrinters(transport: Exclude<PrinterTransport, 'BUILTIN'>): Promise<PrinterDevice[]> {
  return transport === 'USB' ? listUsbPrinters() : listPairedPrinters();
}

/**
 * Gửi dữ liệu ESC/POS tới máy in theo đúng cách nối đã cấu hình.
 * `chunkDelayMs` > 0 (dữ liệu ảnh lớn) chỉ áp dụng cho Bluetooth; USB và máy in tích hợp có điều khiển luồng riêng.
 */
export async function sendToPrinter(
  printer: Pick<PrinterConfig, 'transport' | 'address'>,
  payload: string,
  chunkDelayMs = 0,
) {
  switch (printer.transport) {
    case 'USB':
      return sendViaUsb(printer.address, payload);
    case 'BUILTIN':
      return sendViaBuiltIn(payload);
    default:
      return sendViaBluetooth(printer.address, payload, chunkDelayMs);
  }
}
