/** `unit` là 'd' cho chữ ASCII không dấu, 'đ' cho bill dạng ảnh. */
export function money(value: string | number, unit = 'd') {
  return `${String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${unit}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function dateTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function methodLabel(method: string) {
  return method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản QR';
}
