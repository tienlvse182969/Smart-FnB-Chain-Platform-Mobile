import { getPosPrinter, type PosPrinterModule } from '@/modules/pos-printer';

import { PrinterError, type PrinterDevice, type PrinterErrorKind } from './printer-core';

function native(): PosPrinterModule {
  const module = getPosPrinter();
  if (!module) {
    throw new PrinterError(
      'Bản app này chưa có module in USB / máy in tích hợp. Hãy dùng development build Android thay cho Expo Go.',
      'UNSUPPORTED',
    );
  }
  return module;
}

const NATIVE_ERROR_KIND: Record<string, PrinterErrorKind> = {
  ERR_USB_PERMISSION: 'USB_PERMISSION',
  ERR_USB_NO_DEVICE: 'DEVICE_NOT_FOUND',
  ERR_BUILTIN_UNAVAILABLE: 'DEVICE_NOT_FOUND',
  ERR_BUILTIN_PAPER: 'PAPER_OUT',
  ERR_BUILTIN_COVER: 'PAPER_OUT',
  ERR_USB_IO: 'CONNECTION',
  ERR_USB_NO_ENDPOINT: 'CONNECTION',
  ERR_BUILTIN_STATE: 'CONNECTION',
};

/** Đổi lỗi native (mã `ERR_*` từ module Kotlin) thành PrinterError có nhóm lỗi để UI hướng dẫn đúng. */
function toPrinterError(error: unknown): PrinterError {
  if (error instanceof PrinterError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error ?? '');
  const kind = typeof code === 'string' ? NATIVE_ERROR_KIND[code] : undefined;
  return new PrinterError(message || 'Không in được', kind ?? 'UNKNOWN');
}

/** Dữ liệu in là chuỗi nhị phân (mỗi ký tự 0–255) nên `btoa` mã hoá đúng từng byte. */
const toBase64 = (payload: string) => btoa(payload);

/** Thiết bị USB có cổng ghi dữ liệu (máy in), máy in chuẩn đứng đầu danh sách. */
export async function listUsbPrinters(): Promise<PrinterDevice[]> {
  try {
    const devices = await native().listUsbDevices();
    return devices.map((device) => ({ address: device.id, name: device.name }));
  } catch (error) {
    throw toPrinterError(error);
  }
}

/** Xin quyền dùng thiết bị USB ngay khi chọn máy in (hộp thoại hệ thống). */
export async function requestUsbPermission(address: string) {
  try {
    await native().requestUsbPermission(address);
  } catch (error) {
    throw toPrinterError(error);
  }
}

export async function sendViaUsb(address: string, payload: string) {
  try {
    await native().writeUsb(address, toBase64(payload));
  } catch (error) {
    throw toPrinterError(error);
  }
}

/** Tên model máy in tích hợp, hoặc null nếu thiết bị này không có máy in tích hợp được hỗ trợ. */
export async function getBuiltInPrinterName(): Promise<string | null> {
  try {
    return await native().getBuiltInPrinter();
  } catch (error) {
    throw toPrinterError(error);
  }
}

export async function sendViaBuiltIn(payload: string) {
  try {
    await native().writeBuiltIn(toBase64(payload));
  } catch (error) {
    throw toPrinterError(error);
  }
}

