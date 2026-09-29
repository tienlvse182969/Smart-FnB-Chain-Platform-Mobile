/**
 * Đặc tả v8.1 — chuỗi F&B gọi món và trả tiền trước tại quầy.
 * Giá trị nghiệp vụ là literal tiếng Việt (so sánh xuyên suốt store); UI dịch qua map trong
 * `src/i18n/labels.ts`.
 */

/** Actor dùng app này: Cashier (POS trước quầy) và Barista (màn hình pha chế). */
export type StaffRole = 'Thu ngân' | 'Pha chế';

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  branch: string;
};

/** Nhóm tuỳ chọn có id này là Size — cùng món + cùng size mới gom được thành một mẻ (mục 8.3). */
export const SIZE_GROUP_ID = 'size';

export type MenuOptionChoice = {
  id: string;
  label: string;
  /** giá cộng thêm, ≥ 0 (mục 12.2) */
  priceDelta: number;
  isDefault?: boolean;
};

/** BR-14: bắt buộc hay không, số chọn tối thiểu, số chọn tối đa. */
export type MenuOptionGroup = {
  id: string;
  label: string;
  required: boolean;
  min: number;
  max: number;
  choices: MenuOptionChoice[];
};

export type MenuItem = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  /** cờ còn bán hôm nay ở cấp chi nhánh (BR-12) */
  available: boolean;
  /** ảnh minh hoạ món, hiển thị trên card ở POS */
  image: string;
  options: MenuOptionGroup[];
  /** false = món pha/làm riêng từng phần (sinh tố xay, bánh mì kẹp…), mỗi dòng là một mẻ (mục 8.3) */
  batchable: boolean;
};

export type MenuCategory = {
  id: string;
  label: string;
  /** Barista lọc theo đồ uống / đồ ăn (BA-01) */
  kind: 'drink' | 'food';
};

/** Tuỳ chọn đã chọn, chụp lại lúc chốt đơn (BR-15). */
export type OrderOption = {
  groupId: string;
  groupLabel: string;
  choiceId: string;
  label: string;
  priceDelta: number;
  /** true = tuỳ chọn mặc định — màn hình pha chế chỉ in đậm tuỳ chọn khác mặc định (mục 12.4) */
  isDefault: boolean;
};

export type LineStatus = 'Chờ pha' | 'Đang pha' | 'Xong' | 'Hết món' | 'Huỷ';

export type OrderLine = {
  id: string;
  menuItemId: string;
  /** giá và tên chụp lúc bán, không tham chiếu ngược sang bảng món (BR-15) */
  name: string;
  categoryId: string;
  batchable: boolean;
  /** tuỳ chọn thuộc nhóm Size, dùng làm khoá gom món */
  sizeChoiceId?: string;
  sizeLabel?: string;
  qty: number;
  /** giá một ly đã gồm giá cộng thêm của mọi tuỳ chọn */
  unitPrice: number;
  options: OrderOption[];
  note?: string;
  status: LineStatus;
  /** mẻ mà dòng này thuộc về sau khi bấm Bắt đầu mẻ */
  batchId?: string;
  startedAt?: string;
};

export type OrderStatus =
  | 'Chờ thanh toán'
  | 'Đã thanh toán'
  | 'Đang pha'
  | 'Sẵn sàng'
  | 'Hoàn tất'
  | 'Đã huỷ';

export type PaymentMethod = 'Tiền mặt' | 'Chuyển khoản QR';

/** Kết quả in bill + phiếu số (CS-04). In lỗi không chặn thanh toán, không chặn đơn xuống pha chế (BR-21). */
export type PrintStatus = 'Đã in' | 'In thất bại';

export type Payment = {
  method: PaymentMethod;
  amount: number;
  /** QR: chuỗi QR (từ PayOS khi có backend) và thời điểm hết hạn tuyệt đối (BR-26) */
  qrCode?: string;
  qrExpiresAt?: string;
  paidAt?: string;
  /** thu ngân đã thu tiền mặt / thao tác */
  collectedBy?: string;
};

export type Order = {
  id: string;
  /** mã đơn số nguyên, dùng làm orderCode gửi PayOS */
  orderCode: number;
  /** số gọi — chỉ có sau khi thanh toán, duy nhất trong ngày (BR-22) */
  callNumber?: number;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  payment?: Payment;
  createdAt: string;
  paidAt?: string;
  readyAt?: string;
  cancelledReason?: string;
  cashierName: string;
  /** chỉ có sau khi thanh toán */
  printStatus?: PrintStatus;
  reprintCount: number;
};

/** Một dòng món trong mẻ, kèm số gọi để pha chế biết ly nào của đơn nào. */
export type BatchEntry = {
  orderId: string;
  callNumber: number;
  paidAt: string;
  line: OrderLine;
};

/** Mẻ pha chế — kết quả thuật toán gom món ở `src/data/batching.ts`. */
export type Batch = {
  key: string;
  menuItemId: string;
  name: string;
  categoryId: string;
  sizeLabel?: string;
  /** 'waiting' = chưa bấm Bắt đầu mẻ; 'started' = mẻ đã khoá */
  state: 'waiting' | 'started';
  entries: BatchEntry[];
  /** tổng số ly (cộng qty các dòng) */
  cupCount: number;
  oldestPaidAt: string;
};
