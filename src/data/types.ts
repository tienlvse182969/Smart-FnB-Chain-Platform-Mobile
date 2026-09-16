/** v6: trạng thái bàn (mục 5.3) — bỏ "Cần dọn", thanh toán xong về Trống ngay */
export type TableStatus = 'Trống' | 'Đã đặt trước' | 'Đang phục vụ' | 'Tạm khoá';

export type TableArea = 'Tầng 1' | 'Sân vườn' | 'VIP';

/** v6: vòng đời dòng món (mục 5.6) — không còn trạm chế biến, không còn "chờ xếp lịch" */
export type OrderItemStatus =
  | 'Trong hàng đợi'
  | 'Đang làm'
  | 'Xong'
  | 'Chờ bưng'
  | 'Đã phục vụ'
  | 'Hết món'
  | 'Huỷ';

/** Nhóm hiển thị cho bếp — chỉ để sắp thứ tự (đồ uống/khai vị lên trước món chính), không chặn gì. */
export type Course = 'Khai vị & đồ uống' | 'Món chính';

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
  available: boolean;
  /** số suất còn lại trong ngày; undefined = không giới hạn (BR-06, BR-07, BR-08) */
  remainingPortions?: number;
  description?: string;
  options: MenuOptionGroup[];
};

export type MenuCategory = {
  id: string;
  label: string;
  course: Course;
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number; // đã gồm option
  qty: number;
  note?: string;
  optionLabels: string[];
  status: OrderItemStatus;
  /** ISO — lúc waiter bấm gửi bếp, dùng để tính FIFO + màu SLA bên bếp */
  queuedAt: string;
  /** waiter đã bấm "nhận việc" bưng món này — chỉ 1 người nhận được, khoá bằng transaction (BR-11) */
  claimedBy?: string;
  /** ISO — thời điểm chuyển sang "Chờ bưng", để tính leo thang 3'/5' (BR-12) */
  waitingSince?: string;
  /** ghi chú phát sinh khi đổi món hết hàng (mục 6.4) */
  swapNote?: string;
};

/** Một lần waiter bấm gửi món. Gọi thêm giữa bữa = order mới cùng session. */
export type SessionOrder = {
  id: string;
  createdAt: string;
  items: OrderItem[];
};

export type CheckoutMethod = 'Chuyển khoản QR' | 'Tiền mặt';

/** Thanh toán ở cấp PHIÊN (gộp mọi order), chỉ Branch Manager sinh mã QR và xác nhận (BR-13). */
export type SessionPayment = {
  requestedAt: string;
  method: CheckoutMethod;
  /** waiter chỉ thu hộ tiền mặt mang lên quầy, hệ thống ghi tên người thu (BR-13) */
  collectedBy?: string;
  collectedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
};

export type SessionStatus = 'Đang hoạt động' | 'Đã đóng' | 'Huỷ';

/** Khái niệm trung tâm: một lượt khách dùng bàn (hoặc khối bàn ghép), chứa nhiều order. */
export type TableSession = {
  id: string;
  /** nhiều bàn khi ghép khối (mục 8) */
  tableIds: string[];
  guests: number;
  openedAt: string;
  status: SessionStatus;
  orders: SessionOrder[];
  payment?: SessionPayment;
};

export type Table = {
  id: string;
  name: string; // T01..T12
  seats: number;
  area: TableArea;
  status: TableStatus;
  /** các bàn liền kề — Branch Manager khai báo thủ công, không suy ra từ toạ độ (mục 8.6) */
  adjacentIds: string[];
  /** phiên đang hoạt động tại bàn (mọi bàn trong 1 khối ghép trỏ cùng id) */
  sessionId?: string;
  /** thông tin đặt trước, chỉ hiển thị (backlog) */
  reservedFor?: { name: string; time: string; partySize: number };
};

/** Kết quả 1 phương án xếp/ghép bàn do thuật toán gợi ý (mục 8.4). */
export type SeatingOption = {
  tableIds: string[];
  tableNames: string[];
  area: TableArea;
  totalSeats: number;
  leftover: number;
};

/** Danh sách đặt trước — chỉ xem (Branch Manager nhận qua điện thoại). */
export type Reservation = {
  id: string;
  guestName: string;
  phone: string;
  partySize: number;
  time: string; // ISO
  note?: string;
  tableName?: string;
};

export type StaffRole = 'Phục vụ' | 'Bếp';

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  branch: string;
};

/** Item đang chờ waiter bưng, đã kèm ngữ cảnh + mức leo thang (BR-12, 3'/5'). */
export type ClaimEntry = {
  key: string;
  sessionId: string;
  orderId: string;
  itemId: string;
  tableName: string;
  name: string;
  qty: number;
  categoryLabel: string;
  waitingSince: string;
  claimedBy?: string;
  escalation: 'thường' | 'khẩn' | 'manager';
};

/** 1 dòng món trong hàng đợi bếp, kèm ngữ cảnh hiển thị + mức SLA riêng của bếp (5'/10'/15'). */
export type KitchenTicketItem = {
  itemId: string;
  sessionId: string;
  orderId: string;
  tableNames: string[];
  menuItemId: string;
  name: string;
  qty: number;
  note?: string;
  optionLabels: string[];
  status: OrderItemStatus;
  categoryId: string;
  categoryLabel: string;
  course: Course;
  queuedAt: string;
  sla: 'bình thường' | 'sắp trễ' | 'trễ';
  /** các id dòng gốc đã gộp mẻ vào thẻ này (batching) */
  mergedItemIds: string[];
};
