import type {
  MenuCategory,
  MenuItem,
  OrderItem,
  OrderItemStatus,
  Reservation,
  Staff,
  Table,
  TableSession,
} from './types';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const minsAhead = (m: number) => new Date(now + m * 60_000).toISOString();

export const staff: Staff = {
  id: 'w1',
  name: 'Lê Văn Tiến',
  role: 'Phục vụ',
  branch: 'Chi nhánh Q1 · Nguyễn Huệ',
};

export const shiftInfo = {
  branch: staff.branch,
  zone: 'Tầng 1 + Sân vườn',
};

export const categories: MenuCategory[] = [
  { id: 'coffee', label: 'Cà phê', servingMode: 'Ra ngay' },
  { id: 'tea', label: 'Trà', servingMode: 'Ra ngay' },
  { id: 'main', label: 'Món chính', servingMode: 'Ra theo bàn' },
  { id: 'side', label: 'Món thêm', servingMode: 'Ra ngay' },
  { id: 'dessert', label: 'Tráng miệng', servingMode: 'Ra ngay' },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

const sizeGroup = {
  id: 'size',
  label: 'Size',
  required: true,
  multiple: false,
  choices: [
    { id: 's', label: 'S', priceDelta: 0 },
    { id: 'm', label: 'M', priceDelta: 6000 },
    { id: 'l', label: 'L', priceDelta: 12000 },
  ],
};

const toppingGroup = {
  id: 'topping',
  label: 'Topping',
  required: false,
  multiple: true,
  choices: [
    { id: 'pearl', label: 'Trân châu', priceDelta: 8000 },
    { id: 'cheese', label: 'Kem cheese', priceDelta: 10000 },
  ],
};

export const menu: MenuItem[] = [
  { id: 'm1', name: 'Cà phê đen đá', categoryId: 'coffee', price: 29000, station: 'Quầy nước', prepMinutes: 3, available: true, options: [sizeGroup] },
  { id: 'm2', name: 'Bạc xỉu', categoryId: 'coffee', price: 39000, station: 'Quầy nước', prepMinutes: 4, available: true, options: [sizeGroup] },
  { id: 'm3', name: 'Cà phê sữa đá', categoryId: 'coffee', price: 35000, station: 'Quầy nước', prepMinutes: 3, available: true, options: [sizeGroup] },
  { id: 'm4', name: 'Cold brew', categoryId: 'coffee', price: 49000, station: 'Quầy nước', prepMinutes: 5, available: false, options: [sizeGroup] },

  { id: 'm5', name: 'Trà đào cam sả', categoryId: 'tea', price: 45000, station: 'Quầy nước', prepMinutes: 4, available: true, options: [sizeGroup, toppingGroup] },
  { id: 'm6', name: 'Trà tắc', categoryId: 'tea', price: 32000, station: 'Quầy nước', prepMinutes: 3, available: true, options: [sizeGroup] },
  { id: 'm7', name: 'Trà sữa trân châu', categoryId: 'tea', price: 42000, station: 'Quầy nước', prepMinutes: 4, available: true, options: [sizeGroup, toppingGroup] },
  { id: 'm8', name: 'Nước cam ép', categoryId: 'tea', price: 38000, station: 'Quầy nước', prepMinutes: 3, available: true, options: [] },

  { id: 'm9', name: 'Cơm gà xối mỡ', categoryId: 'main', price: 55000, station: 'Bếp chính', prepMinutes: 12, available: true, remainingPortions: 8, options: [] },
  { id: 'm10', name: 'Cơm sườn bì chả', categoryId: 'main', price: 59000, station: 'Bếp chính', prepMinutes: 13, available: true, options: [] },
  { id: 'm11', name: 'Cơm bò lúc lắc', categoryId: 'main', price: 79000, station: 'Bếp chính', prepMinutes: 15, available: true, remainingPortions: 3, options: [] },
  { id: 'm12', name: 'Bún chả Hà Nội', categoryId: 'main', price: 65000, station: 'Bếp chính', prepMinutes: 10, available: true, options: [] },
  { id: 'm13', name: 'Phở bò tái', categoryId: 'main', price: 60000, station: 'Bếp chính', prepMinutes: 8, available: true, options: [] },

  { id: 'm14', name: 'Khoai tây chiên', categoryId: 'side', price: 39000, station: 'Bếp chính', prepMinutes: 6, available: true, options: [] },
  { id: 'm15', name: 'Gỏi cuốn tôm thịt', categoryId: 'side', price: 45000, station: 'Bếp chính', prepMinutes: 7, available: true, remainingPortions: 4, options: [] },
  { id: 'm16', name: 'Chả giò', categoryId: 'side', price: 42000, station: 'Bếp chính', prepMinutes: 8, available: true, options: [] },
  { id: 'm17', name: 'Canh chua cá', categoryId: 'side', price: 49000, station: 'Bếp chính', prepMinutes: 9, available: true, options: [] },

  { id: 'm18', name: 'Bánh flan', categoryId: 'dessert', price: 22000, station: 'Quầy tráng miệng', prepMinutes: 2, available: true, options: [] },
  { id: 'm19', name: 'Chè khúc bạch', categoryId: 'dessert', price: 32000, station: 'Quầy tráng miệng', prepMinutes: 3, available: true, options: [] },
  { id: 'm20', name: 'Rau câu dừa', categoryId: 'dessert', price: 25000, station: 'Quầy tráng miệng', prepMinutes: 2, available: true, options: [] },
];

export const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

const sm = (categoryId: string) => categoryById[categoryId]?.servingMode ?? 'Ra ngay';
const st = (menuItemId: string) => menuById[menuItemId]?.station ?? 'Quầy nước';

type SeedItem = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  optionLabels?: string[];
  note?: string;
  status: OrderItemStatus;
  claimedBy?: string;
  waitingSince?: string;
};

const mkItem = (s: SeedItem): OrderItem => ({
  id: s.id,
  menuItemId: s.menuItemId,
  name: s.name,
  station: st(s.menuItemId),
  servingMode: sm(menuById[s.menuItemId]?.categoryId ?? ''),
  unitPrice: s.unitPrice,
  qty: s.qty,
  optionLabels: s.optionLabels ?? [],
  note: s.note,
  status: s.status,
  claimedBy: s.claimedBy,
  waitingSince: s.waitingSince,
});

export const tables: Table[] = [
  { id: 't01', name: 'T01', seats: 2, area: 'Tầng 1', status: 'Đang phục vụ', sessionId: 's1' },
  { id: 't02', name: 'T02', seats: 4, area: 'Tầng 1', status: 'Trống' },
  { id: 't03', name: 'T03', seats: 4, area: 'Tầng 1', status: 'Đã đặt trước', reservedFor: { name: 'Trần Minh Quân', time: minsAhead(25), partySize: 4 } },
  { id: 't04', name: 'T04', seats: 6, area: 'Tầng 1', status: 'Trống' },
  { id: 't05', name: 'T05', seats: 4, area: 'Tầng 1', status: 'Đang phục vụ', sessionId: 's2' },
  { id: 't06', name: 'T06', seats: 4, area: 'Sân vườn', status: 'Cần dọn' },
  { id: 't07', name: 'T07', seats: 4, area: 'Sân vườn', status: 'Trống' },
  { id: 't08', name: 'T08', seats: 6, area: 'Sân vườn', status: 'Đang phục vụ', sessionId: 's3' },
  { id: 't09', name: 'T09', seats: 2, area: 'Sân vườn', status: 'Đã đặt trước', reservedFor: { name: 'Phạm Gia Bảo', time: minsAhead(80), partySize: 2 } },
  { id: 't10', name: 'T10', seats: 6, area: 'VIP', status: 'Đang phục vụ', sessionId: 's4' },
  { id: 't11', name: 'T11', seats: 4, area: 'VIP', status: 'Trống' },
  { id: 't12', name: 'T12', seats: 8, area: 'VIP', status: 'Trống' },
];

export const sessions: TableSession[] = [
  {
    id: 's1',
    tableId: 't01',
    guests: 2,
    openedAt: minsAgo(40),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's1o1',
        createdAt: minsAgo(38),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: false,
        method: 'QR',
        paidAt: minsAgo(37),
        items: [
          mkItem({ id: 's1i1', menuItemId: 'm3', name: 'Cà phê sữa đá', unitPrice: 41000, qty: 2, optionLabels: ['Size M'], status: 'Đã phục vụ' }),
          mkItem({ id: 's1i2', menuItemId: 'm5', name: 'Trà đào cam sả', unitPrice: 53000, qty: 1, optionLabels: ['Size L', 'Trân châu'], status: 'Chờ bưng', waitingSince: minsAgo(6) }),
          mkItem({ id: 's1i3', menuItemId: 'm14', name: 'Khoai tây chiên', unitPrice: 39000, qty: 1, status: 'Đang làm' }),
        ],
      },
    ],
  },
  {
    id: 's2',
    tableId: 't05',
    guests: 4,
    openedAt: minsAgo(15),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's2o1',
        createdAt: minsAgo(4),
        paymentStatus: 'Chờ thanh toán',
        viaWaiter: false,
        items: [
          mkItem({ id: 's2i1', menuItemId: 'm9', name: 'Cơm gà xối mỡ', unitPrice: 55000, qty: 2, note: 'Ít mỡ hành', status: 'Chờ xếp lịch' }),
          mkItem({ id: 's2i2', menuItemId: 'm6', name: 'Trà tắc', unitPrice: 38000, qty: 2, optionLabels: ['Size M'], status: 'Chờ xếp lịch' }),
        ],
      },
      {
        id: 's2o2',
        createdAt: minsAgo(12),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: false,
        method: 'QR',
        paidAt: minsAgo(11),
        items: [
          mkItem({ id: 's2i3', menuItemId: 'm2', name: 'Bạc xỉu', unitPrice: 45000, qty: 2, optionLabels: ['Size M'], status: 'Đang làm' }),
        ],
      },
    ],
  },
  {
    id: 's3',
    tableId: 't08',
    guests: 6,
    openedAt: minsAgo(50),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's3o1',
        createdAt: minsAgo(46),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: false,
        method: 'QR',
        paidAt: minsAgo(45),
        items: [
          mkItem({ id: 's3i1', menuItemId: 'm12', name: 'Bún chả Hà Nội', unitPrice: 65000, qty: 2, status: 'Xong' }),
          mkItem({ id: 's3i2', menuItemId: 'm10', name: 'Cơm sườn bì chả', unitPrice: 59000, qty: 1, status: 'Đang làm' }),
          mkItem({ id: 's3i3', menuItemId: 'm8', name: 'Nước cam ép', unitPrice: 38000, qty: 3, status: 'Chờ bưng', waitingSince: minsAgo(2) }),
        ],
      },
      {
        id: 's3o2',
        createdAt: minsAgo(20),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: true,
        method: 'Tiền mặt',
        paidAt: minsAgo(19),
        items: [
          mkItem({ id: 's3i4', menuItemId: 'm15', name: 'Gỏi cuốn tôm thịt', unitPrice: 45000, qty: 2, status: 'Hết món' }),
          mkItem({ id: 's3i5', menuItemId: 'm16', name: 'Chả giò', unitPrice: 42000, qty: 1, status: 'Đang làm' }),
        ],
      },
    ],
  },
  {
    id: 's4',
    tableId: 't10',
    guests: 3,
    openedAt: minsAgo(70),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's4o1',
        createdAt: minsAgo(66),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: false,
        method: 'QR',
        paidAt: minsAgo(65),
        items: [
          mkItem({ id: 's4i1', menuItemId: 'm1', name: 'Cà phê đen đá', unitPrice: 29000, qty: 3, optionLabels: ['Size S'], status: 'Đã phục vụ' }),
          mkItem({ id: 's4i2', menuItemId: 'm18', name: 'Bánh flan', unitPrice: 22000, qty: 2, status: 'Đã phục vụ' }),
        ],
      },
    ],
  },
];

export const reservations: Reservation[] = [
  { id: 'r1', guestName: 'Trần Minh Quân', phone: '0912 345 678', partySize: 4, time: minsAhead(25), note: 'Gần cửa sổ', tableName: 'T03' },
  { id: 'r2', guestName: 'Phạm Gia Bảo', phone: '0933 111 222', partySize: 2, time: minsAhead(80), tableName: 'T09' },
  { id: 'r3', guestName: 'Nguyễn Thu Hà', phone: '0901 234 567', partySize: 6, time: minsAhead(150), note: 'Có trẻ em, cần ghế cao' },
];
