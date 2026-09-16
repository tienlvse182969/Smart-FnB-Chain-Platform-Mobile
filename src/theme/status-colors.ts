import type { TableStatus } from '@/src/data/types';

/**
 * Màu theo trạng thái bàn — CHỈ dùng ở sơ đồ bàn (ô bàn + badge + chú thích) để
 * phục vụ nhận diện nhanh. Phần còn lại của app vẫn giữ đơn sắc trắng–đen.
 *
 * - `fill`  : màu đậm cho badge / viền nhấn
 * - `tint`  : nền nhạt tô cho cả ô bàn
 * - `on`    : màu chữ nằm trên `fill`
 */
export const TABLE_STATUS_COLORS: Record<
  TableStatus,
  { fill: string; tint: string; on: string }
> = {
  Trống: { fill: '#2E7D32', tint: '#E6F2E7', on: '#FFFFFF' }, // xanh lá — sẵn sàng
  'Đã đặt trước': { fill: '#B7791F', tint: '#FBF0DA', on: '#FFFFFF' }, // vàng hổ phách — lưu ý
  'Đang phục vụ': { fill: '#1E5FB4', tint: '#E4EDFB', on: '#FFFFFF' }, // xanh dương — đang dùng
  'Tạm khoá': { fill: '#5A6169', tint: '#EBECEE', on: '#FFFFFF' }, // xám — ngừng hoạt động
};
