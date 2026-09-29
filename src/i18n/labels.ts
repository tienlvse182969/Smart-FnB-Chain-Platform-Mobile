import type { LineStatus, OrderStatus, PaymentMethod, StaffRole } from '@/src/data/types';

/**
 * Các type literal tiếng Việt trong `src/data/types.ts` là giá trị business logic dùng để
 * so sánh xuyên suốt `store.tsx` — không đổi được. Map này chỉ ánh xạ sang i18n key để hiển
 * thị, tách UI copy khỏi identifier nghiệp vụ.
 */
export const lineStatusKey: Record<LineStatus, string> = {
  'Chờ pha': 'status.line.queued',
  'Đang pha': 'status.line.preparing',
  Xong: 'status.line.done',
  'Hết món': 'status.line.outOfStock',
  Huỷ: 'status.line.cancelled',
};

export const orderStatusKey: Record<OrderStatus, string> = {
  'Chờ thanh toán': 'status.order.pendingPayment',
  'Đã thanh toán': 'status.order.paid',
  'Đang pha': 'status.order.preparing',
  'Sẵn sàng': 'status.order.ready',
  'Hoàn tất': 'status.order.completed',
  'Đã huỷ': 'status.order.cancelled',
};

export const paymentMethodKey: Record<PaymentMethod, string> = {
  'Tiền mặt': 'status.payment.cash',
  'Chuyển khoản QR': 'status.payment.qr',
};

export const staffRoleKey: Record<StaffRole, string> = {
  'Thu ngân': 'status.role.cashier',
  'Pha chế': 'status.role.barista',
};
