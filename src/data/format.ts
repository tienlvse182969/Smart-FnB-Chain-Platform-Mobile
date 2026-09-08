export const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`;

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return diffMs >= 0 ? 'vừa xong' : 'ngay bây giờ';
  const label = mins < 60 ? `${mins} phút` : `${Math.round(mins / 60)} giờ`;
  return diffMs >= 0 ? `${label} trước` : `sau ${label}`;
}

export function clockAt(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function durationSince(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}g ${m}p` : `${m} phút`;
}
