import AsyncStorage from '@react-native-async-storage/async-storage';

/** Nhóm lỗi in để UI báo đúng nguyên nhân và hướng dẫn xử lý cho thu ngân. */
export type PrinterErrorKind =
  | 'NOT_CONFIGURED'
  | 'UNSUPPORTED'
  | 'NO_PERMISSION'
  | 'BLUETOOTH_OFF'
  | 'USB_PERMISSION'
  | 'DEVICE_NOT_FOUND'
  | 'PAPER_OUT'
  | 'CONNECTION'
  | 'UNKNOWN';

export class PrinterError extends Error {
  kind: PrinterErrorKind;

  constructor(message: string, kind: PrinterErrorKind = 'UNKNOWN') {
    super(message);
    this.kind = kind;
  }
}

/** Chưa chọn máy in nào cho thiết bị này (khác với lỗi khi đang in). */
export class PrinterNotConfiguredError extends PrinterError {
  constructor(message: string) {
    super(message, 'NOT_CONFIGURED');
  }
}

export type PrintFailure = { kind: PrinterErrorKind; message: string };

/** Chuẩn hoá mọi ngoại lệ phát sinh khi in (kể cả lỗi ngoài PrinterError như mất mạng khi lấy bill) để hiển thị. */
export function toPrintFailure(error: unknown): PrintFailure {
  if (error instanceof PrinterError) return { kind: error.kind, message: error.message };
  return { kind: 'UNKNOWN', message: error instanceof Error ? error.message : String(error ?? '') };
}

/** `image`: dựng bill thành ảnh (có dấu, font như app). `text`: chữ ASCII không dấu, nhanh hơn. */
export type PrintMode = 'image' | 'text';

/**
 * Cách nối với máy in: `BLUETOOTH` (ghép đôi), `USB` (cắm dây vào cổng USB của máy POS), `BUILTIN` (máy in tích hợp
 * trong máy POS, hiện hỗ trợ Sunmi).
 */
export type PrinterTransport = 'BLUETOOTH' | 'USB' | 'BUILTIN';

/** `address` là MAC (Bluetooth), `VID:PID` thập phân (USB) hoặc cố định `builtin` (máy in tích hợp). */
export type PrinterConfig = { transport: PrinterTransport; address: string; name: string; printMode: PrintMode };

export type PrinterDevice = { address: string; name: string };

export const BUILTIN_ADDRESS = 'builtin';

const STORAGE_KEY = 'smartfnb.printer';

export async function loadPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Cấu hình cũ chưa có `transport` (chỉ Bluetooth) và có thể lưu `textMode` ('ascii' | 'utf8'); máy in này không đọc
    // được UTF-8 nên chuyển sang ảnh.
    const saved = JSON.parse(raw) as Partial<PrinterConfig> & { address: string; name: string };
    return {
      transport: saved.transport === 'USB' || saved.transport === 'BUILTIN' ? saved.transport : 'BLUETOOTH',
      address: saved.address,
      name: saved.name,
      printMode: saved.printMode === 'text' ? 'text' : 'image',
    };
  } catch {
    return null;
  }
}

export async function savePrinterConfig(config: PrinterConfig) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function clearPrinterConfig() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
