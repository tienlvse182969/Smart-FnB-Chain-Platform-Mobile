import UPNG from 'upng-js';

import { EscPos } from './escpos';

/** Số điểm ngang của đầu in 58mm (203dpi). Phiếu in thử có khung rộng đúng số này để kiểm tra máy thật. */
export const PRINT_WIDTH_DOTS = 384;

/** Chụp ảnh gấp đôi độ rộng in rồi thu nhỏ để chữ mịn, ít răng cưa. */
export const CAPTURE_SCALE = 2;

/** Điểm có độ sáng dưới ngưỡng này được in đen; hơi cao hơn 128 vì chấm nhiệt làm nét mảnh đi. */
const BLACK_THRESHOLD = 160;

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type Bitmap = { bits: Uint8Array; widthBytes: number; rows: number };

/** Giải mã PNG base64, thu về `targetWidth` điểm ngang (trung bình vùng), rồi chuyển thành bitmap 1 bit. */
export function pngToBitmap(base64Png: string, targetWidth = PRINT_WIDTH_DOTS): Bitmap {
  const bytes = base64ToBytes(base64Png);
  const png = UPNG.decode(bytes.buffer as ArrayBuffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);

  const scale = png.width / targetWidth;
  const rows = Math.max(1, Math.round(png.height / scale));
  const widthBytes = Math.ceil(targetWidth / 8);
  const bits = new Uint8Array(widthBytes * rows);

  for (let y = 0; y < rows; y += 1) {
    const y0 = Math.floor(y * scale);
    const y1 = Math.min(png.height, Math.max(y0 + 1, Math.ceil((y + 1) * scale)));
    for (let x = 0; x < targetWidth; x += 1) {
      const x0 = Math.floor(x * scale);
      const x1 = Math.min(png.width, Math.max(x0 + 1, Math.ceil((x + 1) * scale)));

      let sum = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * png.width + sx) * 4;
          const alpha = rgba[i + 3] / 255;
          const luma = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          sum += luma * alpha + 255 * (1 - alpha);
          count += 1;
        }
      }
      if (count > 0 && sum / count < BLACK_THRESHOLD) {
        bits[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return { bits, widthBytes, rows };
}

/** Ghép các ảnh PNG (mỗi ảnh là một phiếu) thành một lần gửi: in ảnh, cho giấy chạy ra, cắt. */
export function buildRasterPayload(pngs: string[]) {
  const printer = new EscPos().init();
  for (const png of pngs) {
    const { bits, widthBytes, rows } = pngToBitmap(png);
    printer.raster(bits, widthBytes, rows).feed(3).cut();
  }
  return printer.toBinaryString();
}
