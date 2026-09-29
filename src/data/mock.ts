import { defaultSelection, optionsFromSelection, sizeOf, unitPriceOf } from './order-utils';
import type {
  LineStatus,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  Order,
  OrderLine,
  OrderStatus,
  PrintStatus,
  Staff,
  StaffRole,
} from './types';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const branchName = 'Chi nhánh Q1 · Nguyễn Huệ';

export const staffByRole: Record<StaffRole, Staff> = {
  'Thu ngân': { id: 'c1', name: 'Lê Văn Tiến', role: 'Thu ngân', branch: branchName },
  'Pha chế': { id: 'b1', name: 'Nguyễn Thị Barista', role: 'Pha chế', branch: branchName },
};

export const categories: MenuCategory[] = [
  { id: 'coffee', label: 'Cà phê', kind: 'drink' },
  { id: 'milktea', label: 'Trà sữa', kind: 'drink' },
  { id: 'fruittea', label: 'Trà trái cây', kind: 'drink' },
  { id: 'food', label: 'Đồ ăn nhanh', kind: 'food' },
];

/** Nhóm tuỳ chọn dùng chung nhiều món — sửa một lần là đổi cho tất cả (mục 12.2). */
const sizeGroup: MenuOptionGroup = {
  id: 'size',
  label: 'Size',
  required: true,
  min: 1,
  max: 1,
  choices: [
    { id: 'size-m', label: 'M', priceDelta: 0, isDefault: true },
    { id: 'size-l', label: 'L', priceDelta: 6000 },
  ],
};

const sugarGroup: MenuOptionGroup = {
  id: 'sugar',
  label: 'Đường',
  required: true,
  min: 1,
  max: 1,
  choices: [
    { id: 'sugar-0', label: '0% đường', priceDelta: 0 },
    { id: 'sugar-30', label: '30% đường', priceDelta: 0 },
    { id: 'sugar-50', label: '50% đường', priceDelta: 0 },
    { id: 'sugar-70', label: '70% đường', priceDelta: 0 },
    { id: 'sugar-100', label: '100% đường', priceDelta: 0, isDefault: true },
  ],
};

const iceGroup: MenuOptionGroup = {
  id: 'ice',
  label: 'Đá',
  required: true,
  min: 1,
  max: 1,
  choices: [
    { id: 'ice-none', label: 'Không đá', priceDelta: 0 },
    { id: 'ice-less', label: 'Ít đá', priceDelta: 0 },
    { id: 'ice-normal', label: 'Đá bình thường', priceDelta: 0, isDefault: true },
  ],
};

const toppingGroup: MenuOptionGroup = {
  id: 'topping',
  label: 'Topping',
  required: false,
  min: 0,
  max: 3,
  choices: [
    { id: 'top-pearl', label: 'Trân châu đen', priceDelta: 5000 },
    { id: 'top-jelly', label: 'Thạch dừa', priceDelta: 5000 },
    { id: 'top-pudding', label: 'Pudding', priceDelta: 7000 },
  ],
};

const extraGroup: MenuOptionGroup = {
  id: 'extra',
  label: 'Thêm',
  required: false,
  min: 0,
  max: 2,
  choices: [
    { id: 'extra-egg', label: 'Thêm trứng ốp la', priceDelta: 8000 },
    { id: 'extra-pate', label: 'Thêm chả', priceDelta: 10000 },
  ],
};

const drinkOptions = [sizeGroup, sugarGroup, iceGroup];
const teaOptions = [sizeGroup, sugarGroup, iceGroup, toppingGroup];

/** Ảnh minh hoạ chỉ để demo giao diện (mock data), seed theo id món cho ổn định. */
const img = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;

export const menu: MenuItem[] = [
  { id: 'm1', name: 'Cà phê sữa đá', categoryId: 'coffee', price: 29000, available: true, image: img('m1-caphesuada'), options: drinkOptions, batchable: true },
  { id: 'm2', name: 'Bạc xỉu', categoryId: 'coffee', price: 32000, available: true, image: img('m2-bacxiu'), options: drinkOptions, batchable: true },
  { id: 'm3', name: 'Cold brew', categoryId: 'coffee', price: 45000, available: true, image: img('m3-coldbrew'), options: drinkOptions, batchable: true },

  { id: 'm4', name: 'Trà sữa truyền thống', categoryId: 'milktea', price: 30000, available: true, image: img('m4-trasuatruyenthong'), options: teaOptions, batchable: true },
  { id: 'm5', name: 'Trà sữa matcha', categoryId: 'milktea', price: 38000, available: true, image: img('m5-trasuamatcha'), options: teaOptions, batchable: true },
  { id: 'm6', name: 'Trà sữa khoai môn', categoryId: 'milktea', price: 36000, available: true, image: img('m6-trasuakhoaimon'), options: teaOptions, batchable: true },
  { id: 'm7', name: 'Hồng trà sữa', categoryId: 'milktea', price: 28000, available: true, image: img('m7-hongtrasua'), options: teaOptions, batchable: true },

  { id: 'm8', name: 'Trà đào cam sả', categoryId: 'fruittea', price: 39000, available: true, image: img('m8-tradaocamsa'), options: teaOptions, batchable: true },
  { id: 'm9', name: 'Trà vải hoa hồng', categoryId: 'fruittea', price: 39000, available: true, image: img('m9-travaihoahong'), options: teaOptions, batchable: true },
  { id: 'm10', name: 'Trà tắc', categoryId: 'fruittea', price: 25000, available: true, image: img('m10-tratac'), options: teaOptions, batchable: true },

  { id: 'm11', name: 'Bánh mì thịt nướng', categoryId: 'food', price: 28000, available: true, image: img('m11-banhmithitnuong'), options: [extraGroup], batchable: false },
  { id: 'm12', name: 'Bánh mì trứng', categoryId: 'food', price: 22000, available: true, image: img('m12-banhmitrung'), options: [extraGroup], batchable: false },
  { id: 'm13', name: 'Cơm gà xối mỡ', categoryId: 'food', price: 45000, available: true, image: img('m13-comgaxoimo'), options: [], batchable: false },
  { id: 'm14', name: 'Xôi mặn', categoryId: 'food', price: 25000, available: true, image: img('m14-xoiman'), options: [extraGroup], batchable: false },
];

const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

/** Dựng một dòng món mock từ menu: chọn theo choiceId, phần còn lại lấy mặc định. */
function mkLine(
  id: string,
  menuItemId: string,
  qty: number,
  picks: Record<string, string[]> = {},
  status: LineStatus = 'Chờ pha',
  extra: { note?: string; batchId?: string; startedAgo?: number } = {},
): OrderLine {
  const item = menuById[menuItemId];
  const options = optionsFromSelection(item, { ...defaultSelection(item), ...picks });
  const size = sizeOf(options);
  return {
    id,
    menuItemId,
    name: item.name,
    categoryId: item.categoryId,
    batchable: item.batchable,
    sizeChoiceId: size?.choiceId,
    sizeLabel: size?.label,
    qty,
    unitPrice: unitPriceOf(item, options),
    options,
    note: extra.note,
    status,
    batchId: extra.batchId,
    startedAt: extra.startedAgo !== undefined ? minsAgo(extra.startedAgo) : undefined,
  };
}

function mkOrder(
  code: number,
  callNumber: number,
  paidAgo: number,
  status: OrderStatus,
  lines: OrderLine[],
  method: 'Tiền mặt' | 'Chuyển khoản QR' = 'Tiền mặt',
  printStatus: PrintStatus = 'Đã in',
): Order {
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const paidAt = minsAgo(paidAgo);
  const cashier = staffByRole['Thu ngân'].name;
  return {
    id: `o${code}`,
    orderCode: code,
    callNumber,
    lines,
    total,
    status,
    payment:
      method === 'Tiền mặt'
        ? { method, amount: total, paidAt, collectedBy: cashier }
        : { method, amount: total, qrCode: `SMARTFNB|${code}|${total}`, paidAt },
    createdAt: minsAgo(paidAgo + 1),
    paidAt,
    readyAt: status === 'Sẵn sàng' ? minsAgo(Math.max(0, paidAgo - 4)) : undefined,
    cashierName: cashier,
    printStatus,
    reprintCount: 0,
  };
}

/**
 * Đơn mẫu để thấy gom mẻ ngay khi mở màn hình Barista: ba đơn có trà sữa truyền thống size L
 * (đường/topping khác nhau) → một mẻ; hai bạc xỉu size M → một mẻ; một mẻ đã bắt đầu; một đơn
 * sẵn sàng nhận; vài đơn đã hoàn tất cho lịch sử.
 */
export const seedOrders: Order[] = [
  mkOrder(1001, 1, 34, 'Hoàn tất', [mkLine('l1001a', 'm1', 1, {}, 'Xong')]),
  mkOrder(1002, 2, 28, 'Hoàn tất', [mkLine('l1002a', 'm11', 2, {}, 'Xong'), mkLine('l1002b', 'm8', 1, { 'size': ['size-l'] }, 'Xong')], 'Chuyển khoản QR'),
  mkOrder(1003, 3, 9, 'Sẵn sàng', [mkLine('l1003a', 'm5', 1, { size: ['size-l'], sugar: ['sugar-50'] }, 'Xong')]),
  mkOrder(1004, 4, 8, 'Đang pha', [
    mkLine('l1004a', 'm2', 2, { size: ['size-m'] }, 'Đang pha', { batchId: 'b_seed1', startedAgo: 3 }),
  ]),
  mkOrder(1005, 5, 4, 'Đã thanh toán', [
    mkLine('l1005a', 'm4', 1, { size: ['size-l'], sugar: ['sugar-50'], topping: ['top-pearl'] }),
    mkLine('l1005b', 'm10', 1, { ice: ['ice-less'] }),
  ]),
  mkOrder(1006, 6, 3, 'Đã thanh toán', [
    mkLine('l1006a', 'm4', 2, { size: ['size-l'], sugar: ['sugar-30'], ice: ['ice-less'], topping: ['top-pearl', 'top-pudding'] }, 'Chờ pha', { note: 'Ly thứ hai ít ngọt hơn' }),
  ], 'Chuyển khoản QR'),
  mkOrder(1007, 7, 2, 'Đã thanh toán', [
    mkLine('l1007a', 'm4', 1, { size: ['size-l'], ice: ['ice-none'] }),
    mkLine('l1007b', 'm11', 1, { extra: ['extra-egg'] }, 'Chờ pha', { note: 'Không rau mùi' }),
  ], 'Tiền mặt', 'In thất bại'),
  mkOrder(1008, 8, 1, 'Đã thanh toán', [mkLine('l1008a', 'm2', 1, { size: ['size-m'], sugar: ['sugar-70'] })]),
];
