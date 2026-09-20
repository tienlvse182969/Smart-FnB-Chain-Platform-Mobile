import type {
  CheckoutMethod,
  Course,
  OrderItemStatus,
  SessionStatus,
  StaffRole,
  TableArea,
  TableStatus,
} from '@/src/data/types';

/**
 * Các type literal tiếng Việt trong `src/data/types.ts` là giá trị business logic dùng để
 * so sánh xuyên suốt `store.tsx` — không đổi được. Map này chỉ ánh xạ sang i18n key để hiển
 * thị, tách UI copy khỏi identifier nghiệp vụ.
 */
export const tableStatusKey: Record<TableStatus, string> = {
  Trống: 'status.table.empty',
  'Đã đặt trước': 'status.table.reserved',
  'Đang phục vụ': 'status.table.occupied',
  'Tạm khoá': 'status.table.locked',
};

export const orderItemStatusKey: Record<OrderItemStatus, string> = {
  'Trong hàng đợi': 'status.item.queued',
  'Đang làm': 'status.item.preparing',
  Xong: 'status.item.done',
  'Chờ bưng': 'status.item.waitingPickup',
  'Đã phục vụ': 'status.item.served',
  'Hết món': 'status.item.outOfStock',
  Huỷ: 'status.item.cancelled',
};

export const orderItemActionKey: Record<OrderItemStatus, string> = {
  'Trong hàng đợi': 'status.itemAction.queued',
  'Đang làm': 'status.itemAction.preparing',
  Xong: 'status.itemAction.done',
  'Chờ bưng': 'status.itemAction.waitingPickup',
  'Đã phục vụ': 'status.itemAction.served',
  'Hết món': 'status.itemAction.outOfStock',
  Huỷ: 'status.itemAction.cancelled',
};

export const sessionStatusKey: Record<SessionStatus, string> = {
  'Đang hoạt động': 'status.session.active',
  'Đã đóng': 'status.session.closed',
  Huỷ: 'status.session.cancelled',
};

export const staffRoleKey: Record<StaffRole, string> = {
  'Phục vụ': 'status.role.waiter',
  Bếp: 'status.role.kitchen',
};

export const courseKey: Record<Course, string> = {
  'Khai vị & đồ uống': 'status.course.starter',
  'Món chính': 'status.course.main',
};

export const checkoutMethodKey: Record<CheckoutMethod, string> = {
  'Chuyển khoản QR': 'status.checkout.qr',
  'Tiền mặt': 'status.checkout.cash',
};

export const tableAreaKey: Record<TableArea, string> = {
  'Tầng 1': 'status.area.floor1',
  'Sân vườn': 'status.area.garden',
  VIP: 'status.area.vip',
};

export const claimEscalationKey: Record<'thường' | 'khẩn' | 'manager', string> = {
  thường: 'status.escalation.normal',
  khẩn: 'status.escalation.urgent',
  manager: 'status.escalation.manager',
};
