const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Số dòng ảnh tối đa trong một lệnh `GS v 0`; chia dải để máy in không tràn bộ đệm. */
const RASTER_STRIP_ROWS = 128;

const ASCII_REPLACEMENTS: Record<string, string> = {
  '×': 'x',
  '·': '-',
  '–': '-',
  '—': '-',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '₫': 'd',
};

/** Bỏ dấu tiếng Việt và ký tự ngoài ASCII; máy in nhiệt này chỉ in chữ ASCII đúng. */
export function stripDiacritics(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7e]/g, (char) => ASCII_REPLACEMENTS[char] ?? '?');
}

/** Ngắt `text` thành các dòng không dài quá `width` cột, ưu tiên ngắt ở khoảng trắng. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (!current) current = rest;
    else if (current.length + 1 + rest.length <= width) current += ` ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/** Bộ dựng lệnh ESC/POS tối giản cho máy in nhiệt 58mm. */
export class EscPos {
  private readonly bytes: number[] = [];

  constructor(readonly width = 32) {}

  private push(...values: number[]) {
    for (const value of values) this.bytes.push(value);
    return this;
  }

  init() {
    return this.push(ESC, 0x40);
  }

  align(side: 'left' | 'center' | 'right') {
    return this.push(ESC, 0x61, side === 'left' ? 0 : side === 'center' ? 1 : 2);
  }

  bold(on: boolean) {
    return this.push(ESC, 0x45, on ? 1 : 0);
  }

  /** Phóng to chữ 1–8 lần theo chiều ngang/dọc. */
  size(w: number, h = w) {
    return this.push(GS, 0x21, ((w - 1) << 4) | (h - 1));
  }

  text(value: string) {
    const content = stripDiacritics(value);
    for (let i = 0; i < content.length; i += 1) this.bytes.push(content.charCodeAt(i) & 0xff);
    return this;
  }

  line(value = '') {
    return this.text(value).push(LF);
  }

  /** Một dòng có chữ trái và chữ phải sát lề phải. */
  row(left: string, right: string) {
    const l = stripDiacritics(left);
    const r = stripDiacritics(right);
    const gap = Math.max(1, this.width - l.length - r.length);
    return this.line(`${l}${' '.repeat(gap)}${r}`);
  }

  divider(char = '-') {
    return this.line(char.repeat(this.width));
  }

  feed(lines = 1) {
    return this.push(ESC, 0x64, lines);
  }

  /** Cắt giấy (máy không có dao cắt sẽ bỏ qua lệnh này). */
  cut() {
    return this.push(GS, 0x56, 0x42, 0x00);
  }

  /** QR gốc của máy in (GS ( k, model 2). Chỉ nhận dữ liệu ASCII, ví dụ URL. */
  qr(data: string, moduleSize = 6) {
    const payload = data.length + 3;
    this.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    this.push(GS, 0x28, 0x6b, payload & 0xff, payload >> 8, 0x31, 0x50, 0x30);
    for (let i = 0; i < data.length; i += 1) this.bytes.push(data.charCodeAt(i) & 0x7f);
    return this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  }

  /**
   * In ảnh 1 bit/điểm (`GS v 0`). `bits` gồm `rows` dòng, mỗi dòng `widthBytes` byte, bit 1 là điểm đen.
   * Ảnh được chia dải để máy in không tràn bộ đệm.
   */
  raster(bits: Uint8Array, widthBytes: number, rows: number) {
    for (let start = 0; start < rows; start += RASTER_STRIP_ROWS) {
      const count = Math.min(RASTER_STRIP_ROWS, rows - start);
      this.push(GS, 0x76, 0x30, 0x00, widthBytes & 0xff, widthBytes >> 8, count & 0xff, count >> 8);
      const from = start * widthBytes;
      const to = from + count * widthBytes;
      for (let i = from; i < to; i += 1) this.bytes.push(bits[i]);
    }
    return this;
  }

  /** Mỗi byte thành một ký tự 0–255, để gửi bằng encoding `latin1`. */
  toBinaryString() {
    let out = '';
    for (let i = 0; i < this.bytes.length; i += 4096) {
      out += String.fromCharCode(...this.bytes.slice(i, i + 4096));
    }
    return out;
  }
}
