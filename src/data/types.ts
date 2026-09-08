export type Station = 'Bếp chính' | 'Quầy nước' | 'Quầy tráng miệng';

/** v2: trạng thái bàn (mục 6.1) */
export type TableStatus = 'Trống' | 'Đã đặt trước' | 'Đang phục vụ' | 'Cần dọn';

export type TableArea = 'Tầng 1' | 'Sân vườn' | 'VIP';

/** v2: chế độ ra món, cấu hình theo danh mục (mục 7.2) */
export type ServingMode = 'Ra ngay' | 'Ra theo bàn';

/** v2: vòng đời order item (mục 6.4) */
export type OrderItemStatus =
  | 'Chờ xếp lịch'
  | 'Trong hàng đợi'
  | 'Đang làm'
  | 'Xong'
  | 'Chờ bưng'
  | 'Đã phục vụ'
  | 'Hết món'
  | 'Huỷ';

/** v2: vòng đời thanh toán của một order (mục 6.3 / 6.5) */
export type OrderPaymentStatus = 'Chờ thanh toán' | 'Đã thanh toán' | 'Hết hạn' | 'Huỷ';

export type SessionStatus = 'Đang hoạt động' | 'Đã đóng';

export type MenuOptionGroup = {
  id: string;
  label: string; // "Size", "Topping"
  required: boolean;
  multiple: boolean;
  choices: { id: string; label: string; priceDelta: number }[];
};

export type MenuItem = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  station: Station;
  /** thời gian chế biến trung bình (phút) — đầu vào thuật toán xếp lịch (mục 9.2) */
  prepMinutes: number;
  available: boolean;
  /** số suất còn lại trong ngày; undefined = không giới hạn (mục 2.2b) */
  remainingPortions?: number;
  description?: string;
  options: MenuOptionGroup[];
};

export type MenuCategory = {
  id: string;
  label: string;
  /** chế độ ra món áp cho cả danh mục (mục 7.2) */
  servingMode: ServingMode;
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  station: Station;
  servingMode: ServingMode;
  unitPrice: number; // đã gồm option
  qty: number;
  note?: string;
  optionLabels: string[];
  status: OrderItemStatus;
  /** waiter đã bấm "nhận việc" bưng món này (BR-08) */
  claimedBy?: string;
  /** ISO — thời điểm chuyển sang "Chờ bưng", để tính leo thang (BR-09) */
  waitingSince?: string;
  /** ghi chú phát sinh khi đổi món hết hàng (WT-08) */
  swapNote?: string;
};

/** Một lần khách bấm gửi món trong phiên. Gọi thêm giữa bữa = order mới cùng session. */
export type SessionOrder = {
  id: string;
  createdAt: string;
  paymentStatus: OrderPaymentStatus;
  /** true = waiter order thay khách (WT-07); false = khách tự quét QR */
  viaWaiter: boolean;
  method?: 'QR' | 'Tiền mặt';
  paidAt?: string;
  items: OrderItem[];
};

/** Khái niệm trung tâm v2: một lượt khách dùng bàn, chứa nhiều order (mục 4). */
export type TableSession = {
  id: string;
  tableId: string;
  guests: number;
  openedAt: string;
  status: SessionStatus;
  orders: SessionOrder[];
};

export type Table = {
  id: string;
  name: string; // T01..T12
  seats: number;
  area: TableArea;
  status: TableStatus;
  /** phiên đang hoạt động tại bàn */
  sessionId?: string;
  /** thông tin đặt trước, chỉ hiển thị (backlog) */
  reservedFor?: { name: string; time: string; partySize: number };
};

/** Danh sách đặt trước — chỉ xem (backlog "nhập đặt bàn hộ khách gọi điện"). */
export type Reservation = {
  id: string;
  guestName: string;
  phone: string;
  partySize: number;
  time: string; // ISO
  note?: string;
  tableName?: string;
};

/** Yêu cầu hoàn tiền chuyển cho Thu ngân (WT-08). */
export type RefundRequest = {
  id: string;
  tableName: string;
  itemName: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: 'Phục vụ';
  branch: string;
};

export type Shift = {
  staffId: string;
  branch: string;
  zone: string;
  checkedInAt: string | null;
};

/** Item đang chờ waiter bưng, đã kèm ngữ cảnh + mức leo thang. */
export type ClaimEntry = {
  key: string;
  sessionId: string;
  orderId: string;
  itemId: string;
  tableName: string;
  name: string;
  qty: number;
  station: Station;
  waitingSince: string;
  claimedBy?: string;
  escalation: 'thường' | 'khẩn' | 'manager';
};
