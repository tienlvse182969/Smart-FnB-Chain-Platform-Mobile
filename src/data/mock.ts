import type {
  MenuCategory,
  MenuItem,
  OrderItem,
  OrderItemStatus,
  Reservation,
  Staff,
  StaffRole,
  Table,
  TableSession,
} from './types';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const minsAhead = (m: number) => new Date(now + m * 60_000).toISOString();

export const staffByRole: Record<StaffRole, Staff> = {
  'Phục vụ': {
    id: 'w1',
    name: 'Lê Văn Tiến',
    role: 'Phục vụ',
    branch: 'Chi nhánh Q1 · Nguyễn Huệ',
  },
  Bếp: {
    id: 'k1',
    name: 'Nguyễn Văn Bếp',
    role: 'Bếp',
    branch: 'Chi nhánh Q1 · Nguyễn Huệ',
  },
};

export const shiftInfo = {
  branch: staffByRole['Phục vụ'].branch,
  zone: 'Tầng 1 + Sân vườn + VIP',
};

export const categories: MenuCategory[] = [
  { id: 'coffee', label: 'Cà phê', course: 'Khai vị & đồ uống' },
  { id: 'tea', label: 'Trà', course: 'Khai vị & đồ uống' },
  { id: 'main', label: 'Món chính', course: 'Món chính' },
  { id: 'side', label: 'Món thêm', course: 'Khai vị & đồ uống' },
  { id: 'dessert', label: 'Tráng miệng', course: 'Món chính' },
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
  { id: 'm1', name: 'Cà phê đen đá', categoryId: 'coffee', price: 29000, available: true, options: [sizeGroup] },
  { id: 'm2', name: 'Bạc xỉu', categoryId: 'coffee', price: 39000, available: true, options: [sizeGroup] },
  { id: 'm3', name: 'Cà phê sữa đá', categoryId: 'coffee', price: 35000, available: true, options: [sizeGroup] },
  { id: 'm4', name: 'Cold brew', categoryId: 'coffee', price: 49000, available: false, options: [sizeGroup] },

  { id: 'm5', name: 'Trà đào cam sả', categoryId: 'tea', price: 45000, available: true, options: [sizeGroup, toppingGroup] },
  { id: 'm6', name: 'Trà tắc', categoryId: 'tea', price: 32000, available: true, options: [sizeGroup] },
  { id: 'm7', name: 'Trà sữa trân châu', categoryId: 'tea', price: 42000, available: true, options: [sizeGroup, toppingGroup] },
  { id: 'm8', name: 'Nước cam ép', categoryId: 'tea', price: 38000, available: true, options: [] },

  { id: 'm9', name: 'Cơm gà xối mỡ', categoryId: 'main', price: 55000, available: true, remainingPortions: 8, options: [] },
  { id: 'm10', name: 'Cơm sườn bì chả', categoryId: 'main', price: 59000, available: true, options: [] },
  { id: 'm11', name: 'Cơm bò lúc lắc', categoryId: 'main', price: 79000, available: true, remainingPortions: 3, options: [] },
  { id: 'm12', name: 'Bún chả Hà Nội', categoryId: 'main', price: 65000, available: true, options: [] },
  { id: 'm13', name: 'Phở bò tái', categoryId: 'main', price: 60000, available: true, options: [] },

  { id: 'm14', name: 'Khoai tây chiên', categoryId: 'side', price: 39000, available: true, options: [] },
  { id: 'm15', name: 'Gỏi cuốn tôm thịt', categoryId: 'side', price: 45000, available: true, remainingPortions: 4, options: [] },
  { id: 'm16', name: 'Chả giò', categoryId: 'side', price: 42000, available: true, options: [] },
  { id: 'm17', name: 'Canh chua cá', categoryId: 'side', price: 49000, available: true, options: [] },

  { id: 'm18', name: 'Bánh flan', categoryId: 'dessert', price: 22000, available: true, options: [] },
  { id: 'm19', name: 'Chè khúc bạch', categoryId: 'dessert', price: 32000, available: true, options: [] },
  { id: 'm20', name: 'Rau câu dừa', categoryId: 'dessert', price: 25000, available: true, options: [] },
];

export const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

const mkItem = (
  id: string,
  menuItemId: string,
  qty: number,
  status: OrderItemStatus,
  queuedAgo: number,
  extra?: { optionLabels?: string[]; note?: string; waitingAgo?: number },
): OrderItem => {
  const mi = menuById[menuItemId];
  return {
    id,
    menuItemId,
    name: mi?.name ?? 'Món',
    unitPrice: mi?.price ?? 0,
    qty,
    optionLabels: extra?.optionLabels ?? [],
    note: extra?.note,
    status,
    queuedAt: minsAgo(queuedAgo),
    waitingSince: extra?.waitingAgo !== undefined ? minsAgo(extra.waitingAgo) : undefined,
  };
};

/** Sơ đồ bàn: liền kề khai báo thủ công trong từng khu vực (mục 8.6). */
export const tables: Table[] = [
  { id: 't01', name: 'T01', seats: 2, area: 'Tầng 1', status: 'Đang phục vụ', adjacentIds: ['t02'], sessionId: 's1' },
  { id: 't02', name: 'T02', seats: 4, area: 'Tầng 1', status: 'Trống', adjacentIds: ['t01', 't03'] },
  { id: 't03', name: 'T03', seats: 4, area: 'Tầng 1', status: 'Đã đặt trước', adjacentIds: ['t02', 't04'], reservedFor: { name: 'Trần Minh Quân', time: minsAhead(25), partySize: 4 } },
  { id: 't04', name: 'T04', seats: 6, area: 'Tầng 1', status: 'Trống', adjacentIds: ['t03', 't05'] },
  { id: 't05', name: 'T05', seats: 4, area: 'Tầng 1', status: 'Đang phục vụ', adjacentIds: ['t04'], sessionId: 's2' },

  { id: 't06', name: 'T06', seats: 4, area: 'Sân vườn', status: 'Tạm khoá', adjacentIds: ['t07'] },
  { id: 't07', name: 'T07', seats: 4, area: 'Sân vườn', status: 'Trống', adjacentIds: ['t06', 't08'] },
  { id: 't08', name: 'T08', seats: 4, area: 'Sân vườn', status: 'Đang phục vụ', adjacentIds: ['t07', 't09'], sessionId: 's3' },
  { id: 't09', name: 'T09', seats: 4, area: 'Sân vườn', status: 'Đang phục vụ', adjacentIds: ['t08'], sessionId: 's3' },

  { id: 't10', name: 'T10', seats: 4, area: 'VIP', status: 'Đang phục vụ', adjacentIds: ['t11'], sessionId: 's4' },
  { id: 't11', name: 'T11', seats: 4, area: 'VIP', status: 'Trống', adjacentIds: ['t10', 't12'] },
  { id: 't12', name: 'T12', seats: 8, area: 'VIP', status: 'Trống', adjacentIds: ['t11'] },
];

export const sessions: TableSession[] = [
  {
    id: 's1',
    tableIds: ['t01'],
    guests: 2,
    openedAt: minsAgo(40),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's1o1',
        createdAt: minsAgo(38),
        items: [
          mkItem('s1i1', 'm3', 2, 'Đã phục vụ', 38, { optionLabels: ['Size M'] }),
          mkItem('s1i2', 'm5', 1, 'Chờ bưng', 20, { optionLabels: ['Size L', 'Trân châu'], waitingAgo: 6 }),
          mkItem('s1i3', 'm14', 1, 'Đang làm', 12),
          mkItem('s1i4', 'm6', 1, 'Trong hàng đợi', 3),
        ],
      },
    ],
  },
  {
    id: 's2',
    tableIds: ['t05'],
    guests: 4,
    openedAt: minsAgo(15),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's2o1',
        createdAt: minsAgo(4),
        items: [
          mkItem('s2i1', 'm9', 2, 'Trong hàng đợi', 4, { note: 'Ít mỡ hành' }),
          mkItem('s2i2', 'm6', 2, 'Trong hàng đợi', 4),
        ],
      },
      {
        id: 's2o2',
        createdAt: minsAgo(12),
        items: [mkItem('s2i3', 'm2', 2, 'Đang làm', 12, { optionLabels: ['Size M'] })],
      },
    ],
  },
  {
    id: 's3',
    tableIds: ['t08', 't09'],
    guests: 6,
    openedAt: minsAgo(50),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's3o1',
        createdAt: minsAgo(46),
        items: [
          mkItem('s3i1', 'm12', 2, 'Đang làm', 18),
          mkItem('s3i2', 'm10', 1, 'Trong hàng đợi', 3),
          mkItem('s3i3', 'm8', 3, 'Chờ bưng', 20, { waitingAgo: 4 }),
        ],
      },
      {
        id: 's3o2',
        createdAt: minsAgo(20),
        items: [
          mkItem('s3i4', 'm15', 2, 'Hết món', 20),
          mkItem('s3i5', 'm16', 1, 'Đang làm', 8),
        ],
      },
    ],
  },
  {
    id: 's4',
    tableIds: ['t10'],
    guests: 3,
    openedAt: minsAgo(70),
    status: 'Đang hoạt động',
    orders: [
      {
        id: 's4o1',
        createdAt: minsAgo(66),
        items: [
          mkItem('s4i1', 'm1', 3, 'Đã phục vụ', 66, { optionLabels: ['Size S'] }),
          mkItem('s4i2', 'm18', 2, 'Đã phục vụ', 66),
        ],
      },
    ],
    payment: { requestedAt: minsAgo(3), method: 'Chuyển khoản QR' },
  },
];

export const reservations: Reservation[] = [
  { id: 'r1', guestName: 'Trần Minh Quân', phone: '0912 345 678', partySize: 4, time: minsAhead(25), note: 'Gần cửa sổ', tableName: 'T03' },
  { id: 'r2', guestName: 'Phạm Gia Bảo', phone: '0933 111 222', partySize: 8, time: minsAhead(80) },
  { id: 'r3', guestName: 'Nguyễn Thu Hà', phone: '0901 234 567', partySize: 6, time: minsAhead(150), note: 'Có trẻ em, cần ghế cao' },
];
