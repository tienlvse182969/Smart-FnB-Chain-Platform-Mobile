import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import {
  categoryById,
  menuById,
  reservations as seedReservations,
  sessions as seedSessions,
  staff,
  tables as seedTables,
} from './mock';
import type {
  ClaimEntry,
  OrderItem,
  OrderItemStatus,
  RefundRequest,
  Reservation,
  SessionOrder,
  Table,
  TableSession,
} from './types';

type State = {
  tables: Table[];
  sessions: TableSession[];
  reservations: Reservation[];
  unavailableMenu: string[];
  refunds: RefundRequest[];
  checkedInAt: string | null;
  simulate: boolean;
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const iso = () => new Date().toISOString();

function initState(): State {
  return {
    tables: clone(seedTables),
    sessions: clone(seedSessions),
    reservations: clone(seedReservations),
    unavailableMenu: ['m4'],
    refunds: [],
    checkedInAt: null,
    simulate: true,
  };
}

export type CartLine = {
  menuItemId: string;
  qty: number;
  note?: string;
  optionLabels: string[];
  unitPrice: number;
};

type Action =
  | { type: 'checkIn' }
  | { type: 'checkOut' }
  | { type: 'setSimulate'; value: boolean }
  | { type: 'openSession'; tableId: string; guests: number }
  | { type: 'closeSession'; sessionId: string }
  | { type: 'markCleaned'; tableId: string }
  | { type: 'cancelSession'; sessionId: string }
  | { type: 'addProxyOrder'; sessionId: string; cart: CartLine[]; method: 'QR' | 'Tiền mặt' }
  | { type: 'claimItem'; itemId: string }
  | { type: 'unclaimItem'; itemId: string }
  | { type: 'serveItem'; itemId: string }
  | { type: 'markOutOfStock'; itemId: string }
  | { type: 'resolveSwap'; itemId: string; newMenuItemId: string; unitPrice: number }
  | { type: 'resolveRefund'; itemId: string; reason: string }
  | { type: 'moveSession'; fromTableId: string; toTableId: string }
  | { type: 'kitchenTick' };

const setTable = (tables: Table[], id: string, patch: Partial<Table>): Table[] =>
  tables.map((t) => (t.id === id ? { ...t, ...patch } : t));

type Found = { session: TableSession; order: SessionOrder; item: OrderItem };

function findItem(sessions: TableSession[], itemId: string): Found | null {
  for (const session of sessions) {
    for (const order of session.orders) {
      const item = order.items.find((i) => i.id === itemId);
      if (item) return { session, order, item };
    }
  }
  return null;
}

/** Backend quyết định lúc nào món chuyển "Chờ bưng" theo chế độ ra món (BR-07). */
function promote(state: State): State {
  let touched = false;
  const sessions = state.sessions.map((session) => ({
    ...session,
    orders: session.orders.map((order) => {
      const groupDone = order.items
        .filter((i) => i.servingMode === 'Ra theo bàn')
        .every((i) => ['Xong', 'Chờ bưng', 'Đã phục vụ'].includes(i.status));
      const items = order.items.map((i) => {
        if (i.status !== 'Xong') return i;
        if (i.servingMode === 'Ra ngay' || groupDone) {
          touched = true;
          return { ...i, status: 'Chờ bưng' as OrderItemStatus, waitingSince: i.waitingSince ?? iso() };
        }
        return i;
      });
      return { ...order, items };
    }),
  }));
  return touched ? { ...state, sessions } : state;
}

function mapItem(
  state: State,
  itemId: string,
  fn: (item: OrderItem) => OrderItem,
): State {
  return {
    ...state,
    sessions: state.sessions.map((s) => ({
      ...s,
      orders: s.orders.map((o) => ({
        ...o,
        items: o.items.map((i) => (i.id === itemId ? fn(i) : i)),
      })),
    })),
  };
}

function baseReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'checkIn':
      return { ...state, checkedInAt: iso() };
    case 'checkOut':
      return { ...state, checkedInAt: null };
    case 'setSimulate':
      return { ...state, simulate: action.value };

    case 'openSession': {
      const id = rid('s');
      const session: TableSession = {
        id,
        tableId: action.tableId,
        guests: action.guests,
        openedAt: iso(),
        status: 'Đang hoạt động',
        orders: [],
      };
      return {
        ...state,
        sessions: [...state.sessions, session],
        tables: setTable(state.tables, action.tableId, {
          status: 'Đang phục vụ',
          sessionId: id,
          reservedFor: undefined,
        }),
      };
    }

    case 'closeSession': {
      const s = state.sessions.find((x) => x.id === action.sessionId);
      return {
        ...state,
        sessions: state.sessions.map((x) =>
          x.id === action.sessionId ? { ...x, status: 'Đã đóng' } : x,
        ),
        tables: s
          ? setTable(state.tables, s.tableId, { status: 'Cần dọn', sessionId: undefined })
          : state.tables,
      };
    }

    case 'markCleaned':
      return { ...state, tables: setTable(state.tables, action.tableId, { status: 'Trống' }) };

    case 'cancelSession': {
      const s = state.sessions.find((x) => x.id === action.sessionId);
      const hasPaid = s?.orders.some((o) => o.paymentStatus === 'Đã thanh toán');
      if (!s || hasPaid) return state;
      return {
        ...state,
        sessions: state.sessions.filter((x) => x.id !== action.sessionId),
        tables: setTable(state.tables, s.tableId, { status: 'Trống', sessionId: undefined }),
      };
    }

    case 'addProxyOrder': {
      const order: SessionOrder = {
        id: rid('o'),
        createdAt: iso(),
        paymentStatus: 'Đã thanh toán',
        viaWaiter: true,
        method: action.method,
        paidAt: iso(),
        items: action.cart.map((c) => {
          const mi = menuById[c.menuItemId];
          return {
            id: rid('i'),
            menuItemId: c.menuItemId,
            name: mi?.name ?? 'Món',
            station: mi?.station ?? 'Quầy nước',
            servingMode: categoryById[mi?.categoryId ?? '']?.servingMode ?? 'Ra ngay',
            unitPrice: c.unitPrice,
            qty: c.qty,
            note: c.note,
            optionLabels: c.optionLabels,
            status: 'Chờ xếp lịch' as OrderItemStatus,
          };
        }),
      };
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, orders: [...s.orders, order] } : s,
        ),
      };
    }

    case 'claimItem':
      return mapItem(state, action.itemId, (i) =>
        i.status === 'Chờ bưng' && !i.claimedBy ? { ...i, claimedBy: staff.name } : i,
      );

    case 'unclaimItem':
      return mapItem(state, action.itemId, (i) =>
        i.claimedBy === staff.name ? { ...i, claimedBy: undefined } : i,
      );

    case 'serveItem':
      return mapItem(state, action.itemId, (i) =>
        i.status === 'Chờ bưng' && i.claimedBy === staff.name
          ? { ...i, status: 'Đã phục vụ' }
          : i,
      );

    case 'markOutOfStock': {
      const found = findItem(state.sessions, action.itemId);
      const next = mapItem(state, action.itemId, (i) => ({ ...i, status: 'Hết món' }));
      return {
        ...next,
        unavailableMenu: found
          ? Array.from(new Set([...state.unavailableMenu, found.item.menuItemId]))
          : state.unavailableMenu,
      };
    }

    case 'resolveSwap': {
      const mi = menuById[action.newMenuItemId];
      return mapItem(state, action.itemId, (i) => {
        const diff = action.unitPrice * i.qty - i.unitPrice * i.qty;
        const swapNote =
          diff > 0
            ? `Đổi từ ${i.name} · phụ thu ${Math.abs(diff).toLocaleString('vi-VN')}₫`
            : diff < 0
              ? `Đổi từ ${i.name} · hoàn ${Math.abs(diff).toLocaleString('vi-VN')}₫`
              : `Đổi từ ${i.name}`;
        return {
          ...i,
          menuItemId: action.newMenuItemId,
          name: mi?.name ?? i.name,
          station: mi?.station ?? i.station,
          servingMode: categoryById[mi?.categoryId ?? '']?.servingMode ?? i.servingMode,
          unitPrice: action.unitPrice,
          optionLabels: [],
          status: 'Chờ xếp lịch',
          claimedBy: undefined,
          waitingSince: undefined,
          swapNote,
        };
      });
    }

    case 'resolveRefund': {
      const found = findItem(state.sessions, action.itemId);
      const next = mapItem(state, action.itemId, (i) => ({ ...i, status: 'Huỷ' }));
      if (!found) return next;
      const table = state.tables.find((t) => t.id === found.session.tableId);
      return {
        ...next,
        refunds: [
          ...state.refunds,
          {
            id: rid('rf'),
            tableName: table?.name ?? found.session.tableId,
            itemName: found.item.name,
            amount: found.item.unitPrice * found.item.qty,
            reason: action.reason,
            createdAt: iso(),
          },
        ],
      };
    }

    case 'moveSession': {
      const from = state.tables.find((t) => t.id === action.fromTableId);
      if (!from?.sessionId) return state;
      let tables = setTable(state.tables, action.fromTableId, {
        status: 'Cần dọn',
        sessionId: undefined,
      });
      tables = setTable(tables, action.toTableId, {
        status: 'Đang phục vụ',
        sessionId: from.sessionId,
      });
      return {
        ...state,
        tables,
        sessions: state.sessions.map((s) =>
          s.id === from.sessionId ? { ...s, tableId: action.toTableId } : s,
        ),
      };
    }

    case 'kitchenTick': {
      const order: OrderItemStatus[] = ['Chờ xếp lịch', 'Trong hàng đợi', 'Đang làm'];
      const nextOf: Record<string, OrderItemStatus> = {
        'Chờ xếp lịch': 'Trong hàng đợi',
        'Trong hàng đợi': 'Đang làm',
        'Đang làm': 'Xong',
      };
      for (const s of state.sessions) {
        for (const o of s.orders) {
          if (o.paymentStatus !== 'Đã thanh toán') continue;
          const target = o.items.find((i) => order.includes(i.status));
          if (target) {
            return mapItem(state, target.id, (i) => ({ ...i, status: nextOf[i.status] }));
          }
        }
      }
      return state;
    }

    default:
      return state;
  }
}

const reducer = (state: State, action: Action): State => promote(baseReducer(state, action));

function minsSince(iso?: string): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function buildClaimQueue(state: State): ClaimEntry[] {
  const out: ClaimEntry[] = [];
  for (const session of state.sessions) {
    const table = state.tables.find((t) => t.id === session.tableId);
    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status !== 'Chờ bưng') continue;
        const m = minsSince(item.waitingSince);
        out.push({
          key: item.id,
          sessionId: session.id,
          orderId: order.id,
          itemId: item.id,
          tableName: table?.name ?? session.tableId,
          name: item.name,
          qty: item.qty,
          station: item.station,
          waitingSince: item.waitingSince ?? iso(),
          claimedBy: item.claimedBy,
          escalation: m > 5 ? 'manager' : m >= 3 ? 'khẩn' : 'thường',
        });
      }
    }
  }
  return out.sort((a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime());
}

type OutOfStock = { itemId: string; sessionId: string; tableName: string; name: string };

function buildOutOfStock(state: State): OutOfStock[] {
  const out: OutOfStock[] = [];
  for (const session of state.sessions) {
    const table = state.tables.find((t) => t.id === session.tableId);
    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status === 'Hết món') {
          out.push({
            itemId: item.id,
            sessionId: session.id,
            tableName: table?.name ?? session.tableId,
            name: item.name,
          });
        }
      }
    }
  }
  return out;
}

type StoreValue = {
  state: State;
  claimQueue: ClaimEntry[];
  unclaimedCount: number;
  outOfStock: OutOfStock[];
  checkIn: () => void;
  checkOut: () => void;
  setSimulate: (v: boolean) => void;
  openSession: (tableId: string, guests: number) => void;
  closeSession: (sessionId: string) => void;
  markCleaned: (tableId: string) => void;
  cancelSession: (sessionId: string) => void;
  addProxyOrder: (sessionId: string, cart: CartLine[], method: 'QR' | 'Tiền mặt') => void;
  claimItem: (itemId: string) => void;
  unclaimItem: (itemId: string) => void;
  serveItem: (itemId: string) => void;
  markOutOfStock: (itemId: string) => void;
  resolveSwap: (itemId: string, newMenuItemId: string, unitPrice: number) => void;
  resolveRefund: (itemId: string, reason: string) => void;
  moveSession: (fromTableId: string, toTableId: string) => void;
  kitchenTick: () => void;
  tableById: (id: string) => Table | undefined;
  sessionByTable: (tableId: string) => TableSession | undefined;
  sessionById: (id: string) => TableSession | undefined;
  outOfStockFor: (sessionId: string) => OutOfStock[];
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  useEffect(() => {
    if (!state.simulate) return;
    const id = setInterval(() => dispatch({ type: 'kitchenTick' }), 9000);
    return () => clearInterval(id);
  }, [state.simulate]);

  const value = useMemo<StoreValue>(() => {
    const claimQueue = buildClaimQueue(state);
    const outOfStock = buildOutOfStock(state);
    return {
      state,
      claimQueue,
      unclaimedCount: claimQueue.filter((c) => !c.claimedBy).length,
      outOfStock,
      checkIn: () => dispatch({ type: 'checkIn' }),
      checkOut: () => dispatch({ type: 'checkOut' }),
      setSimulate: (value) => dispatch({ type: 'setSimulate', value }),
      openSession: (tableId, guests) => dispatch({ type: 'openSession', tableId, guests }),
      closeSession: (sessionId) => dispatch({ type: 'closeSession', sessionId }),
      markCleaned: (tableId) => dispatch({ type: 'markCleaned', tableId }),
      cancelSession: (sessionId) => dispatch({ type: 'cancelSession', sessionId }),
      addProxyOrder: (sessionId, cart, method) =>
        dispatch({ type: 'addProxyOrder', sessionId, cart, method }),
      claimItem: (itemId) => dispatch({ type: 'claimItem', itemId }),
      unclaimItem: (itemId) => dispatch({ type: 'unclaimItem', itemId }),
      serveItem: (itemId) => dispatch({ type: 'serveItem', itemId }),
      markOutOfStock: (itemId) => dispatch({ type: 'markOutOfStock', itemId }),
      resolveSwap: (itemId, newMenuItemId, unitPrice) =>
        dispatch({ type: 'resolveSwap', itemId, newMenuItemId, unitPrice }),
      resolveRefund: (itemId, reason) => dispatch({ type: 'resolveRefund', itemId, reason }),
      moveSession: (fromTableId, toTableId) =>
        dispatch({ type: 'moveSession', fromTableId, toTableId }),
      kitchenTick: () => dispatch({ type: 'kitchenTick' }),
      tableById: (id) => state.tables.find((t) => t.id === id),
      sessionByTable: (tableId) =>
        state.sessions.find((s) => s.tableId === tableId && s.status === 'Đang hoạt động'),
      sessionById: (id) => state.sessions.find((s) => s.id === id),
      outOfStockFor: (sessionId) => outOfStock.filter((o) => o.sessionId === sessionId),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/** Item chỉ được huỷ/sửa khi còn ở hàng đợi (BR-06). */
export const EDITABLE_ITEM_STATUSES: OrderItemStatus[] = ['Chờ xếp lịch', 'Trong hàng đợi'];

export function orderTotal(order: SessionOrder): number {
  return order.items
    .filter((i) => i.status !== 'Huỷ')
    .reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function sessionTotal(session: TableSession): number {
  return session.orders
    .filter((o) => o.paymentStatus === 'Đã thanh toán')
    .reduce((sum, o) => sum + orderTotal(o), 0);
}
