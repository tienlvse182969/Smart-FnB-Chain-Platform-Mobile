import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

export type UsbDevice = { id: string; name: string; isPrinterClass: boolean };

/** Hàm native của module `PosPrinter` (Android). Dữ liệu in là chuỗi base64 của các byte ESC/POS. */
export type PosPrinterModule = {
  listUsbDevices(): Promise<UsbDevice[]>;
  requestUsbPermission(id: string): Promise<boolean>;
  writeUsb(id: string, base64: string): Promise<void>;
  /** Tên model máy in tích hợp (Sunmi) hoặc null nếu máy không có. */
  getBuiltInPrinter(): Promise<string | null>;
  writeBuiltIn(base64: string): Promise<void>;
};

let cached: PosPrinterModule | null | undefined;

/** Module native chỉ có trong development build Android; Expo Go/iOS/web trả về null để app vẫn mở được. */
export function getPosPrinter(): PosPrinterModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') return (cached = null);
  try {
    cached = requireNativeModule<PosPrinterModule>('PosPrinter');
  } catch {
    cached = null;
  }
  return cached;
}
