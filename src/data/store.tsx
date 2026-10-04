import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { buildBatches } from './batching';
import { categories as seedCategories, menu as seedMenu, seedOrders } from './mock';
import type {
  Batch,
  BatchEntry,
  MenuCategory,
  MenuItem,
  Order,
  OrderLine,
  OrderOption,
  Payment,
  StaffRole,
} from './types';

export type CurrentUser = { id: string; name: string };

/** Thời hạn của một mã QR chờ thanh toán (BR-26). Cấu hình được khi có backend. */
export const QR_TTL_MS = 10 * 60_000;
/** Đơn Sẵn sàng mà khách không tới nhận thì tự chuyển Hoàn tất (mục 5.3, CC-09). */
export const READY_AUTO_COMPLETE_MS = 30 * 60_000;

type State = {
  role: StaffRole | null;
  currentUser: CurrentUser | null;
  checkedInAt: string | null;
  menu: MenuItem[];
  categories: MenuCategory[];
  /** choiceId các tuỳ chọn đang tắt ở chi nhánh (hết topping…) — BA-03, BR-12 */
  unavailableOptions: string[];
  cart: CartLine[];
  orders: Order[];
  nextOrderCode: number;
  /** số gọi đã cấp trong ngày `callDay` (BR-22) */
  callCounter: number;
  callDay: string;
  /** giả lập máy in lỗi (kẹt/hết giấy, mất kết nối) để demo luồng In thất bại — CS-04, BR-21 */
  printerOffline: boolean;
};

/** Giỏ hàng ở POS — chưa thuộc đơn nào cho tới khi chốt (mục 5.3: không có trạng thái Nháp). */
export type CartLine = {
  key: string;
  name: string;
  menuItemId: string;
  qty: number;
  note?: string;
  options: OrderOption[];
  unitPrice: number;
};

type Action =
  | { type: 'checkIn'; role: StaffRole; user: CurrentUser }
  | { type: 'checkOut' }
  | { type: 'addCartLine'; line: CartLine }
  | { type: 'setCartQty'; key: string; qty: number }
  | { type: 'removeCartLine'; key: string }
  | { type: 'decrementMenuItem'; menuItemId: string }
  | { type: 'clearCart' }
  | { type: 'addOrder'; order: Order }
  | { type: 'payCash'; orderId: string; cashier: string }
  | { type: 'startQr'; orderId: string }
  | { type: 'confirmQrPaid'; orderId: string }
  | { type: 'switchToCash'; orderId: string }
  | { type: 'cancelOrder'; orderId: string; reason: string }
  | { type: 'reprint'; orderId: string }
  | { type: 'setPrinterOffline'; value: boolean }
  | { type: 'startBatch'; lineIds: string[] }
  | { type: 'finishLines'; lineIds: string[] }
  | { type: 'handOver'; orderId: string }
  | { type: 'setMenuAvailability'; menuItemId: string; available: boolean }
  | { type: 'setOptionAvailability'; choiceId: string; available: boolean }
  | { type: 'tick' }
  | { type: 'replaceMenu'; menu: MenuItem[]; categories: MenuCategory[] };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const iso = () => new Date().toISOString();
const today = () => new Date().toDateString();

function initState(): State {
  const orders = clone(seedOrders);
  return {
    role: null,
    currentUser: null,
    checkedInAt: null,
    menu: clone(seedMenu),
    categories: clone(seedCategories),
    unavailableOptions: [],
    cart: [],
    orders,
    nextOrderCode: Math.max(...orders.map((o) => o.orderCode)) + 1,
    callCounter: Math.max(...orders.map((o) => o.callNumber ?? 0)),
    callDay: today(),
    printerOffline: false,
  };
}

const mapOrder = (state: State, orderId: string, fn: (o: Order) => Order): State => ({
  ...state,
  orders: state.orders.map((o) => (o.id === orderId ? fn(o) : o)),
});

/** Cấp số gọi tăng dần, bắt đầu lại từ 1 mỗi ngày (BR-22). */
function issueCallNumber(state: State): { state: State; callNumber: number } {
  const sameDay = state.callDay === today();
  const callNumber = (sameDay ? state.callCounter : 0) + 1;
  return { state: { ...state, callCounter: callNumber, callDay: today() }, callNumber };
}

/**
 * Đơn chuyển Đã thanh toán: cấp số gọi và đẩy dòng món vào hàng đợi pha chế (BR-17). Trên
 * backend thật đây là một transaction cùng với ghi thanh toán (BR-27).
 */
function markPaid(state: State, orderId: string, payment: Payment): State {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'Chờ thanh toán') return state;
  const issued = issueCallNumber(state);
  const paidAt = payment.paidAt ?? iso();
  return mapOrder(issued.state, orderId, (o) => ({
    ...o,
    status: 'Đã thanh toán',
    callNumber: issued.callNumber,
    paidAt,
    payment: { ...payment, paidAt },
    // BR-21: in lỗi không chặn thanh toán và không chặn đơn xuống pha chế — chỉ ghi trạng thái để in lại
    printStatus: state.printerOffline ? 'In thất bại' : 'Đã in',
  }));
}

/** Tất cả dòng chưa huỷ đều Xong → đơn Sẵn sàng, gọi số (BR-33). */
function refreshReadiness(state: State, orderIds: Set<string>): State {
  return {
    ...state,
    orders: state.orders.map((o) => {
      if (!orderIds.has(o.id) || (o.status !== 'Đang pha' && o.status !== 'Đã thanh toán')) return o;
      const live = o.lines.filter((l) => l.status !== 'Huỷ');
      const allDone = live.length > 0 && live.every((l) => l.status === 'Xong');
      if (allDone) return { ...o, status: 'Sẵn sàng', readyAt: iso() };
      const started = live.some((l) => l.status === 'Đang pha' || l.status === 'Xong');
      return started && o.status === 'Đã thanh toán' ? { ...o, status: 'Đang pha' } : o;
    }),
  };
}

const isQueuedOrder = (o: Order) => o.status === 'Đã thanh toán' || o.status === 'Đang pha';

/** BR-36: tắt món/tuỳ chọn thì dòng đã trả tiền nhưng chưa pha chuyển Hết món, báo Manager. */
function flagOutOfStock(state: State, matches: (l: OrderLine) => boolean): State {
  return {
    ...state,
    orders: state.orders.map((o) =>
      isQueuedOrder(o)
        ? {
            ...o,
            lines: o.lines.map((l) =>
              l.status === 'Chờ pha' && matches(l) ? { ...l, status: 'Hết món' as const } : l,
            ),
          }
        : o,
    ),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'replaceMenu':
      return {
        ...state,
        menu: action.menu,
        categories: action.categories,
        unavailableOptions: action.menu.flatMap((item) =>
          item.options.flatMap((group) => group.choices.filter((choice) => choice.available === false).map((choice) => choice.id)),
        ),
      };
    case 'checkIn':
      return { ...state, role: action.role, currentUser: action.user, checkedInAt: iso() };
    // đơn và menu giữ nguyên khi đăng xuất để demo Cashier → Barista trên cùng một máy
    case 'checkOut':
      return { ...state, role: null, currentUser: null, checkedInAt: null, cart: [] };

    case 'addCartLine':
      return { ...state, cart: [...state.cart, action.line] };
    case 'setCartQty':
      return {
        ...state,
        cart: state.cart.map((l) => (l.key === action.key ? { ...l, qty: action.qty } : l)),
      };
    case 'removeCartLine':
      return { ...state, cart: state.cart.filter((l) => l.key !== action.key) };
    /** Bớt 1 suất khỏi dòng thêm gần nhất của món này; hết suất thì bỏ hẳn dòng đó. */
    case 'decrementMenuItem': {
      const idx = state.cart.map((l) => l.menuItemId).lastIndexOf(action.menuItemId);
      if (idx === -1) return state;
      const line = state.cart[idx];
      const cart =
        line.qty > 1
          ? state.cart.map((l, i) => (i === idx ? { ...l, qty: l.qty - 1 } : l))
          : state.cart.filter((_, i) => i !== idx);
      return { ...state, cart };
    }
    case 'clearCart':
      return { ...state, cart: [] };

    case 'addOrder':
      return {
        ...state,
        orders: [...state.orders, { ...action.order, orderCode: state.nextOrderCode }],
        nextOrderCode: state.nextOrderCode + 1,
      };

    case 'payCash': {
      const order = state.orders.find((o) => o.id === action.orderId);
      // tiền mặt: thu ngân chỉ xác nhận đã thu, không nhập tiền khách đưa (quầy không có tủ tiền tự động)
      if (!order || order.status !== 'Chờ thanh toán') return state;
      return markPaid(state, action.orderId, {
        method: 'Tiền mặt',
        amount: order.total,
        collectedBy: action.cashier,
      });
    }

    case 'startQr':
      return mapOrder(state, action.orderId, (o) =>
        o.status !== 'Chờ thanh toán'
          ? o
          : {
              ...o,
              payment: {
                method: 'Chuyển khoản QR',
                amount: o.total,
                // mã do PayOS trả về khi có backend (BR-26): orderCode + amount
                qrCode: `SMARTFNB|${o.orderCode}|${o.total}`,
                qrExpiresAt: new Date(Date.now() + QR_TTL_MS).toISOString(),
              },
            },
      );

    case 'confirmQrPaid': {
      const order = state.orders.find((o) => o.id === action.orderId);
      const p = order?.payment;
      if (!order || order.status !== 'Chờ thanh toán' || p?.method !== 'Chuyển khoản QR') return state;
      if (p.qrExpiresAt && new Date(p.qrExpiresAt).getTime() < Date.now()) return state;
      return markPaid(state, action.orderId, p);
    }

    // BR-30: đổi sang tiền mặt thì huỷ QR trước
    case 'switchToCash':
      return mapOrder(state, action.orderId, (o) =>
        o.status === 'Chờ thanh toán' ? { ...o, payment: undefined } : o,
      );

    case 'cancelOrder':
      return mapOrder(state, action.orderId, (o) =>
        o.status === 'Chờ thanh toán'
          ? { ...o, status: 'Đã huỷ', payment: undefined, cancelledReason: action.reason }
          : o,
      );

    case 'reprint':
      return mapOrder(state, action.orderId, (o) => ({
        ...o,
        reprintCount: o.reprintCount + 1,
        printStatus: state.printerOffline ? 'In thất bại' : 'Đã in',
      }));

    case 'setPrinterOffline':
      return { ...state, printerOffline: action.value };

    case 'startBatch': {
      const ids = new Set(action.lineIds);
      const batchId = rid('b');
      const startedAt = iso();
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (!isQueuedOrder(o) || !o.lines.some((l) => ids.has(l.id))) return o;
          return {
            ...o,
            status: 'Đang pha',
            lines: o.lines.map((l) =>
              ids.has(l.id) && l.status === 'Chờ pha'
                ? { ...l, status: 'Đang pha' as const, batchId, startedAt }
                : l,
            ),
          };
        }),
      };
    }

    case 'finishLines': {
      const ids = new Set(action.lineIds);
      const touched = new Set<string>();
      const next: State = {
        ...state,
        orders: state.orders.map((o) => {
          if (!o.lines.some((l) => ids.has(l.id) && l.status === 'Đang pha')) return o;
          touched.add(o.id);
          return {
            ...o,
            lines: o.lines.map((l) =>
              ids.has(l.id) && l.status === 'Đang pha' ? { ...l, status: 'Xong' as const } : l,
            ),
          };
        }),
      };
      return refreshReadiness(next, touched);
    }

    case 'handOver':
      return mapOrder(state, action.orderId, (o) =>
        o.status === 'Sẵn sàng' ? { ...o, status: 'Hoàn tất' } : o,
      );

    case 'setMenuAvailability': {
      const menu: MenuItem[] = state.menu.map((m): MenuItem =>
        m.id === action.menuItemId
          ? {
              ...m,
              branchAvailable: action.available,
              available:
                action.available &&
                (m.chainAvailable ?? true) &&
                (m.branchEnabled ?? true) &&
                (m.remainingPortions === undefined ||
                  m.remainingPortions === null ||
                  m.remainingPortions > 0),
              unavailableReason: m.chainAvailable === false
                ? 'CHAIN_DISABLED'
                : m.branchEnabled === false
                  ? 'NOT_ASSIGNED_TO_BRANCH'
                  : !action.available
                    ? 'BRANCH_SOLD_OUT'
                    : m.remainingPortions === 0
                      ? 'NO_REMAINING_PORTIONS'
                      : null,
            }
          : m,
      );
      const next = { ...state, menu };
      return action.available ? next : flagOutOfStock(next, (l) => l.menuItemId === action.menuItemId);
    }

    case 'setOptionAvailability': {
      const has = state.unavailableOptions.includes(action.choiceId);
      if (action.available === !has) return state;
      const next = {
        ...state,
        menu: state.menu.map((item) => ({
          ...item,
          options: item.options.map((group) => ({
            ...group,
            choices: group.choices.map((choice) =>
              choice.id === action.choiceId
                ? {
                    ...choice,
                    branchAvailable: action.available,
                    available: action.available && (choice.chainAvailable ?? true),
                  }
                : choice,
            ),
          })),
        })),
        unavailableOptions: action.available
          ? state.unavailableOptions.filter((id) => id !== action.choiceId)
          : [...state.unavailableOptions, action.choiceId],
      };
      return action.available
        ? next
        : flagOutOfStock(next, (l) => l.options.some((o) => o.choiceId === action.choiceId));
    }

    case 'tick': {
      const nowMs = Date.now();
      let changed = false;
      const orders = state.orders.map((o): Order => {
        // BR-30: QR hết hạn mà chưa nhận tiền → huỷ đơn
        if (
          o.status === 'Chờ thanh toán' &&
          o.payment?.qrExpiresAt &&
          new Date(o.payment.qrExpiresAt).getTime() < nowMs
        ) {
          changed = true;
          return { ...o, status: 'Đã huỷ', payment: undefined, cancelledReason: 'QR hết hạn' };
        }
        if (
          o.status === 'Sẵn sàng' &&
          o.readyAt &&
          nowMs - new Date(o.readyAt).getTime() > READY_AUTO_COMPLETE_MS
        ) {
          changed = true;
          return { ...o, status: 'Hoàn tất' };
        }
        return o;
      });
      return changed ? { ...state, orders } : state;
    }

    default:
      return state;
  }
}

export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; unavailable: string[] };

type StoreValue = {
  state: State;
  /** hàng đợi pha chế đã gom mẻ (mục 8) */
  batches: Batch[];
  /** đơn Sẵn sàng đã gọi số, chờ khách tới nhận */
  readyOrders: Order[];
  /** dòng đã trả tiền nhưng món/tuỳ chọn hết — Barista chỉ báo, Manager xử lý (BR-36) */
  outOfStockEntries: BatchEntry[];
  /** đơn mới nhất trước — lịch sử đơn của Cashier */
  ordersNewestFirst: Order[];
  checkIn: (role: StaffRole, user: CurrentUser) => void;
  checkOut: () => void;
  addCartLine: (line: Omit<CartLine, 'key'>) => void;
  setCartQty: (key: string, qty: number) => void;
  removeCartLine: (key: string) => void;
  decrementMenuItem: (menuItemId: string) => void;
  clearCart: () => void;
  replaceMenu: (menu: MenuItem[], categories: MenuCategory[]) => void;
  /** Chốt đơn từ giỏ hiện tại: kiểm tra lại món còn bán, chụp giá lúc bán (BR-15, BR-16). */
  createOrder: () => CreateOrderResult;
  payCash: (orderId: string) => void;
  startQr: (orderId: string) => void;
  confirmQrPaid: (orderId: string) => void;
  switchToCash: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  reprint: (orderId: string) => void;
  setPrinterOffline: (value: boolean) => void;
  startBatch: (lineIds: string[]) => void;
  finishLines: (lineIds: string[]) => void;
  handOver: (orderId: string) => void;
  setMenuAvailability: (menuItemId: string, available: boolean) => void;
  setOptionAvailability: (choiceId: string, available: boolean) => void;
  orderById: (id: string) => Order | undefined;
  isMenuAvailable: (menuItemId: string) => boolean;
  isOptionAvailable: (choiceId: string) => boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // QR hết hạn / đơn quên nhận tự đóng — dùng chung một nhịp thay vì mỗi màn hình tự đặt timer
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 5000);
    return () => clearInterval(id);
  }, []);

  const createOrder = useCallback(
    (): CreateOrderResult => {
      const cart = state.cart;
      if (cart.length === 0) return { ok: false, unavailable: [] };
      // BR-16: kiểm tra lại món/tuỳ chọn còn bán lúc chốt đơn, kể cả món bị tắt sau khi đã vào giỏ
      const unavailable = new Set<string>();
      for (const c of cart) {
        const mi = state.menu.find((m) => m.id === c.menuItemId);
        if (!mi || !mi.available) unavailable.add(mi?.name ?? c.menuItemId);
        for (const o of c.options) {
          if (state.unavailableOptions.includes(o.choiceId)) unavailable.add(o.label);
        }
      }
      if (unavailable.size > 0) return { ok: false, unavailable: [...unavailable] };

      const lines: OrderLine[] = cart.map((c) => {
        const mi = state.menu.find((m) => m.id === c.menuItemId)!;
        const size = c.options.find((o) => o.groupId === 'size');
        return {
          id: rid('l'),
          menuItemId: mi.id,
          name: mi.name,
          categoryId: mi.categoryId,
          batchable: mi.batchable,
          sizeChoiceId: size?.choiceId,
          sizeLabel: size?.label,
          qty: c.qty,
          unitPrice: c.unitPrice,
          options: c.options,
          note: c.note,
          status: 'Chờ pha',
        };
      });
      const order: Order = {
        id: rid('o'),
        orderCode: 0, // reducer cấp mã đơn
        lines,
        total: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
        status: 'Chờ thanh toán',
        createdAt: iso(),
        cashierName: state.currentUser?.name ?? '',
        reprintCount: 0,
      };
      dispatch({ type: 'addOrder', order });
      return { ok: true, orderId: order.id };
    },
    [state.cart, state.menu, state.unavailableOptions, state.currentUser],
  );

  const replaceMenu = useCallback(
    (menu: MenuItem[], categories: MenuCategory[]) =>
      dispatch({ type: 'replaceMenu', menu, categories }),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const batches = buildBatches(state.orders);
    const outOfStockEntries: BatchEntry[] = [];
    for (const o of state.orders) {
      if (!isQueuedOrder(o) || o.callNumber === undefined || !o.paidAt) continue;
      for (const line of o.lines) {
        if (line.status === 'Hết món') {
          outOfStockEntries.push({ orderId: o.id, callNumber: o.callNumber, paidAt: o.paidAt, line });
        }
      }
    }
    return {
      state,
      batches,
      readyOrders: state.orders
        .filter((o) => o.status === 'Sẵn sàng')
        .sort((a, b) => (a.readyAt ?? '').localeCompare(b.readyAt ?? '')),
      outOfStockEntries,
      ordersNewestFirst: [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      checkIn: (role, user) => dispatch({ type: 'checkIn', role, user }),
      checkOut: () => dispatch({ type: 'checkOut' }),
      addCartLine: (line) =>
        dispatch({ type: 'addCartLine', line: { ...line, key: rid('c') } }),
      setCartQty: (key, qty) => dispatch({ type: 'setCartQty', key, qty }),
      removeCartLine: (key) => dispatch({ type: 'removeCartLine', key }),
      decrementMenuItem: (menuItemId) => dispatch({ type: 'decrementMenuItem', menuItemId }),
      clearCart: () => dispatch({ type: 'clearCart' }),
      replaceMenu,
      createOrder,
      payCash: (orderId) =>
        dispatch({ type: 'payCash', orderId, cashier: state.currentUser?.name ?? '' }),
      startQr: (orderId) => dispatch({ type: 'startQr', orderId }),
      confirmQrPaid: (orderId) => dispatch({ type: 'confirmQrPaid', orderId }),
      switchToCash: (orderId) => dispatch({ type: 'switchToCash', orderId }),
      cancelOrder: (orderId, reason) => dispatch({ type: 'cancelOrder', orderId, reason }),
      reprint: (orderId) => dispatch({ type: 'reprint', orderId }),
      setPrinterOffline: (value) => dispatch({ type: 'setPrinterOffline', value }),
      startBatch: (lineIds) => dispatch({ type: 'startBatch', lineIds }),
      finishLines: (lineIds) => dispatch({ type: 'finishLines', lineIds }),
      handOver: (orderId) => dispatch({ type: 'handOver', orderId }),
      setMenuAvailability: (menuItemId, available) =>
        dispatch({ type: 'setMenuAvailability', menuItemId, available }),
      setOptionAvailability: (choiceId, available) =>
        dispatch({ type: 'setOptionAvailability', choiceId, available }),
      orderById: (id) => state.orders.find((o) => o.id === id),
      isMenuAvailable: (menuItemId) => state.menu.find((m) => m.id === menuItemId)?.available ?? false,
      isOptionAvailable: (choiceId) => !state.unavailableOptions.includes(choiceId),
    };
  }, [state, createOrder, replaceMenu]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
