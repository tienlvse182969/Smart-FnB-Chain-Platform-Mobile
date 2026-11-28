import { PermissionsAndroid, Platform } from 'react-native';

import { PrinterError, type PrinterDevice } from './printer-core';

type BluetoothModule = typeof import('react-native-bluetooth-classic').default;

const CHUNK_SIZE = 1024;

// Nạp module native khi cần để app vẫn mở được trên Expo Go (không có module này); khi đó in sẽ báo lỗi rõ ràng.
function bluetooth(): BluetoothModule {
  if (Platform.OS !== 'android') throw new PrinterError('In qua Bluetooth hiện chỉ hỗ trợ Android.', 'UNSUPPORTED');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-bluetooth-classic').default as BluetoothModule;
  } catch {
    throw new PrinterError(
      'Bản app này chưa có module Bluetooth. Hãy dùng development build thay cho Expo Go.',
      'UNSUPPORTED',
    );
  }
}

async function ensureReady(bt: BluetoothModule) {
  if (typeof Platform.Version === 'number' && Platform.Version >= 31) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new PrinterError('Chưa cấp quyền Bluetooth cho ứng dụng. Hãy cấp quyền trong Cài đặt.', 'NO_PERMISSION');
    }
  }
  if (!(await bt.isBluetoothEnabled())) {
    throw new PrinterError('Bluetooth đang tắt. Hãy bật Bluetooth rồi thử lại.', 'BLUETOOTH_OFF');
  }
}

/** Các thiết bị đã ghép đôi với máy POS (ghép máy in trong Cài đặt Bluetooth của Android trước). */
export async function listPairedPrinters(): Promise<PrinterDevice[]> {
  const bt = bluetooth();
  await ensureReady(bt);
  const devices = await bt.getBondedDevices();
  return devices.map((device) => ({ address: device.address, name: device.name || device.address }));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function writeAll(bt: BluetoothModule, address: string, payload: string, chunkDelayMs: number) {
  const connected = await bt.isDeviceConnected(address).catch(() => false);
  const device = connected ? await bt.getConnectedDevice(address) : await bt.connectToDevice(address);
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    await device.write(payload.slice(i, i + CHUNK_SIZE), 'latin1');
    // Dữ liệu ảnh lớn: nghỉ giữa các gói để bộ đệm của máy in kịp xử lý.
    if (chunkDelayMs > 0) await sleep(chunkDelayMs);
  }
}

/**
 * Gửi dữ liệu ESC/POS qua Bluetooth; kết nối cũ có thể đã chết nên thử lại một lần với kết nối mới.
 * `chunkDelayMs` > 0 dùng cho ảnh (dữ liệu lớn).
 */
export async function sendViaBluetooth(address: string, payload: string, chunkDelayMs: number) {
  const bt = bluetooth();
  await ensureReady(bt);
  try {
    await writeAll(bt, address, payload, chunkDelayMs);
  } catch {
    await bt.disconnectFromDevice(address).catch(() => false);
    try {
      await writeAll(bt, address, payload, chunkDelayMs);
    } catch {
      throw new PrinterError(
        'Không kết nối được máy in. Hãy kiểm tra máy in đã bật, còn giấy và đã ghép đôi.',
        'CONNECTION',
      );
    }
  }
}
