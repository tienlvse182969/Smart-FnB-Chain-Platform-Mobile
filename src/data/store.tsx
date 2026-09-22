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
  menu,
  menuById,
  reservations as seedReservations,
  sessions as seedSessions,
  staffByRole,
  tables as seedTables,
} from './mock';
import type {
  ClaimEntry,
  Course,
  KitchenTicketItem,
  OrderItem,
  OrderItemStatus,
  Reservation,
  SessionOrder,
  StaffRole,
  Table,
  TableSession,
} from './types';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

type State = {
  role: StaffRole | null;
  currentUser: CurrentUser | null;
  tables: Table[];
  sessions: TableSession[];
  reservations: Reservation[];
  unavailableMenu: string[];
  remainingPortions: Record<string, number>;
  checkedInAt: string | null;
  simulate: boolean;
  kitchenStationCategories: string[];
  kitchenView: 'item' | 'ticket';
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const iso = () => new Date().toISOString();
const minsSince = (t?: string) => (t ? Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 60_000)) : 0);

function initState(): State {
  return {
    role: null,
    currentUser: null,
    tables: clone(seedTables),
    sessions: clone(seedSessions),
    reservations: clone(seedReservations),
    unavailableMenu: menu.filter((m) => !m.available).map((m) => m.id),
    remainingPortions: Object.fromEntries(
      menu.filter((m) => m.remainingPortions !== undefined).map((m) => [m.id, m.remainingPortions!]),
    ),
    checkedInAt: null,
    simulate: true,
    kitchenStationCategories: [],
    kitchenView: 'item',
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
  | { type: 'checkIn'; role: StaffRole; user?: CurrentUser }
  | { type: 'checkOut' }
  | { type: 'setSimulate'; value: boolean }
  | { type: 'setKitchenStationCategories'; categoryIds: string[] }
  | { type: 'setKitchenView'; view: 'item' | 'ticket' }
  | { type: 'openSession'; tableIds: string[]; guests: number }
  | { type: 'mergeTableIntoSession'; sessionId: string; tableId: string }
  | { type: 'moveSession'; sessionId: string; toTableIds: string[] }
  | { type: 'cancelSession'; sessionId: string }
  | { type: 'submitOrder'; sessionId: string; cart: CartLine[] }
  | { type: 'patchItem'; itemId: string; patch: Partial<OrderItem> }
  | { type: 'removeItem'; itemId: string }
  | { type: 'setItemStatus'; itemId: string; status: OrderItemStatus }
  | { type: 'claimItem'; itemId: string }
  | { type: 'unclaimItem'; itemId: string }
  | { type: 'serveItem'; itemId: string }
  | { type: 'dropOutOfStockItem'; itemId: string }
  | { type: 'resolveSwap'; itemId: string; newMenuItemId: string }
  | { type: 'setMenuAvailability'; menuItemId: string; available: boolean }
  | { type: 'setRemainingPortions'; menuItemId: string; value: number }
  | { type: 'requestCheckout'; sessionId: string; method: 'Chuyển khoản QR' | 'Tiền mặt' }
  | { type: 'collectCash'; sessionId: string }
  | { type: 'autoConfirmPayments' }
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

/** Backend sinh trạng thái "Chờ bưng" ngay khi bếp báo Xong — không còn chờ theo nhóm/bàn. */
function promote(state: State): State {
  let touched = false;
  const sessions = state.sessions.map((session) => ({
    ...session,
    orders: session.orders.map((order) => ({
      ...order,
      items: order.items.map((i) => {
        if (i.status !== 'Xong') return i;
        touched = true;
        return { ...i, status: 'Chờ bưng' as OrderItemStatus, waitingSince: i.waitingSince ?? iso() };
      }),
    })),
  }));
  return touched ? { ...state, sessions } : state;
}

function baseReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'checkIn':
      return { ...state, checkedInAt: iso(), role: action.role, currentUser: action.user ?? null };
    case 'checkOut':
      return { ...state, checkedInAt: null, role: null, currentUser: null };
    case 'setSimulate':
      return { ...state, simulate: action.value };
    case 'setKitchenStationCategories':
      return { ...state, kitchenStationCategories: action.categoryIds };
    case 'setKitchenView':
      return { ...state, kitchenView: action.view };

    case 'openSession': {
      const id = rid('s');
      const session: TableSession = {
        id,
        tableIds: action.tableIds,
        guests: action.guests,
        openedAt: iso(),
        status: 'Đang hoạt động',
        orders: [],
      };
      let tables = state.tables;
      for (const tId of action.tableIds) {
        tables = setTable(tables, tId, {
          status: 'Đang phục vụ',
          sessionId: id,
          reservedFor: undefined,
        });
      }
      return { ...state, sessions: [...state.sessions, session], tables };
    }

    case 'mergeTableIntoSession': {
      const sessions = state.sessions.map((s) =>
        s.id === action.sessionId ? { ...s, tableIds: [...s.tableIds, action.tableId] } : s,
      );
      const tables = setTable(state.tables, action.tableId, {
        status: 'Đang phục vụ',
        sessionId: action.sessionId,
      });
      return { ...state, sessions, tables };
    }

    case 'moveSession': {
      const s = state.sessions.find((x) => x.id === action.sessionId);
      if (!s) return state;
      let tables = state.tables;
      for (const from of s.tableIds) {
        tables = setTable(tables, from, { status: 'Trống', sessionId: undefined });
      }
      for (const to of action.toTableIds) {
        tables = setTable(tables, to, { status: 'Đang phục vụ', sessionId: action.sessionId });
      }
      return {
        ...state,
        tables,
        sessions: state.sessions.map((x) =>
          x.id === action.sessionId ? { ...x, tableIds: action.toTableIds } : x,
        ),
      };
    }

    case 'cancelSession': {
      const s = state.sessions.find((x) => x.id === action.sessionId);
      if (!s || s.orders.length > 0) return state;
      let tables = state.tables;
      for (const tId of s.tableIds) {
        tables = setTable(tables, tId, { status: 'Trống', sessionId: undefined });
      }
      return { ...state, tables, sessions: state.sessions.filter((x) => x.id !== action.sessionId) };
    }

    case 'submitOrder': {
      const now = iso();
      const items: OrderItem[] = action.cart.map((c) => {
        const mi = menuById[c.menuItemId];
        return {
          id: rid('i'),
          menuItemId: c.menuItemId,
          name: mi?.name ?? 'Món',
          unitPrice: c.unitPrice,
          qty: c.qty,
          note: c.note,
          optionLabels: c.optionLabels,
          status: 'Trong hàng đợi',
          queuedAt: now,
        };
      });
      const order: SessionOrder = { id: rid('o'), createdAt: now, items };
      const remainingPortions = { ...state.remainingPortions };
      for (const c of action.cart) {
        if (remainingPortions[c.menuItemId] !== undefined) {
          remainingPortions[c.menuItemId] = Math.max(0, remainingPortions[c.menuItemId] - c.qty);
        }
      }
      return {
        ...state,
        remainingPortions,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, orders: [...s.orders, order] } : s,
        ),
      };
    }

    case 'patchItem': {
      const found = findItem(state.sessions, action.itemId);
      let remainingPortions = state.remainingPortions;
      if (found && action.patch.qty !== undefined && remainingPortions[found.item.menuItemId] !== undefined) {
        const delta = found.item.qty - action.patch.qty;
        remainingPortions = {
          ...remainingPortions,
          [found.item.menuItemId]: Math.max(0, remainingPortions[found.item.menuItemId] + delta),
        };
      }
      return { ...mapItem(state, action.itemId, (i) => ({ ...i, ...action.patch })), remainingPortions };
    }

    case 'removeItem': {
      const found = findItem(state.sessions, action.itemId);
      if (!found || found.item.status !== 'Trong hàng đợi') return state;
      let remainingPortions = state.remainingPortions;
      if (remainingPortions[found.item.menuItemId] !== undefined) {
        remainingPortions = {
          ...remainingPortions,
          [found.item.menuItemId]: remainingPortions[found.item.menuItemId] + found.item.qty,
        };
      }
      return {
        ...state,
        remainingPortions,
        sessions: state.sessions.map((s) => ({
          ...s,
          orders: s.orders.map((o) => ({ ...o, items: o.items.filter((i) => i.id !== action.itemId) })),
        })),
      };
    }

    case 'setItemStatus': {
      const next = mapItem(state, action.itemId, (i) => ({ ...i, status: action.status }));
      if (action.status !== 'Hết món') return next;
      const found = findItem(state.sessions, action.itemId);
      return {
        ...next,
        unavailableMenu: found
          ? Array.from(new Set([...state.unavailableMenu, found.item.menuItemId]))
          : state.unavailableMenu,
      };
    }

    case 'claimItem': {
      const me = state.currentUser?.name ?? staffByRole['Phục vụ'].name;
      return mapItem(state, action.itemId, (i) =>
        i.status === 'Chờ bưng' && !i.claimedBy ? { ...i, claimedBy: me } : i,
      );
    }

    case 'unclaimItem': {
      const me = state.currentUser?.name ?? staffByRole['Phục vụ'].name;
      return mapItem(state, action.itemId, (i) => (i.claimedBy === me ? { ...i, claimedBy: undefined } : i));
    }

    case 'serveItem': {
      const me = state.currentUser?.name ?? staffByRole['Phục vụ'].name;
      return mapItem(state, action.itemId, (i) =>
        i.status === 'Chờ bưng' && i.claimedBy === me ? { ...i, status: 'Đã phục vụ' } : i,
      );
    }

    case 'dropOutOfStockItem':
      return {
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          orders: s.orders.map((o) => ({ ...o, items: o.items.filter((i) => i.id !== action.itemId) })),
        })),
      };

    case 'resolveSwap': {
      const mi = menuById[action.newMenuItemId];
      return mapItem(state, action.itemId, (i) => ({
        ...i,
        menuItemId: action.newMenuItemId,
        name: mi?.name ?? i.name,
        unitPrice: mi?.price ?? i.unitPrice,
        optionLabels: [],
        status: 'Trong hàng đợi',
        queuedAt: iso(),
        claimedBy: undefined,
        waitingSince: undefined,
        swapNote: `Đổi từ ${i.name}`,
      }));
    }

    case 'setMenuAvailability': {
      const has = state.unavailableMenu.includes(action.menuItemId);
      if (action.available && has) {
        return { ...state, unavailableMenu: state.unavailableMenu.filter((id) => id !== action.menuItemId) };
      }
      if (!action.available && !has) {
        return { ...state, unavailableMenu: [...state.unavailableMenu, action.menuItemId] };
      }
      return state;
    }

    case 'setRemainingPortions':
      return {
        ...state,
        remainingPortions: { ...state.remainingPortions, [action.menuItemId]: Math.max(0, action.value) },
      };

    case 'requestCheckout':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, payment: { requestedAt: iso(), method: action.method } }
            : s,
        ),
      };

    case 'collectCash': {
      const s = state.sessions.find((x) => x.id === action.sessionId);
      if (!s || !s.payment || s.payment.method !== 'Tiền mặt' || s.payment.collectedBy) return state;
      const me = state.currentUser?.name ?? staffByRole['Phục vụ'].name;
      return {
        ...state,
        sessions: state.sessions.map((x) =>
          x.id === action.sessionId
            ? { ...x, payment: { ...x.payment!, collectedBy: me, collectedAt: iso() } }
            : x,
        ),
      };
    }

    /** Đóng vai Branch Manager sinh mã QR và xác nhận thanh toán (BR-13) — waiter không có action nào gọi tới đây. */
    case 'autoConfirmPayments': {
      const target = state.sessions.find(
        (s) =>
          s.status === 'Đang hoạt động' &&
          s.payment &&
          !s.payment.confirmedAt &&
          (s.payment.method === 'Chuyển khoản QR' || !!s.payment.collectedBy),
      );
      if (!target) return state;
      let tables = state.tables;
      for (const tId of target.tableIds) {
        tables = setTable(tables, tId, { status: 'Trống', sessionId: undefined });
      }
      return {
        ...state,
        tables,
        sessions: state.sessions.map((x) =>
          x.id === target.id
            ? {
                ...x,
                status: 'Đã đóng',
                payment: { ...x.payment!, confirmedAt: iso(), confirmedBy: 'Quản lý chi nhánh (giả lập)' },
              }
            : x,
        ),
      };
    }

    case 'kitchenTick': {
      const order: OrderItemStatus[] = ['Trong hàng đợi', 'Đang làm'];
      const nextOf: Record<string, OrderItemStatus> = {
        'Trong hàng đợi': 'Đang làm',
        'Đang làm': 'Xong',
      };
      for (const s of state.sessions) {
        for (const o of s.orders) {
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

function tableNamesOf(tables: Table[], tableIds: string[]): string[] {
  return tableIds.map((id) => tables.find((t) => t.id === id)?.name ?? id);
}

function buildClaimQueue(state: State): ClaimEntry[] {
  const out: ClaimEntry[] = [];
  for (const session of state.sessions) {
    if (session.status !== 'Đang hoạt động') continue;
    const tableName = tableNamesOf(state.tables, session.tableIds).join(' + ');
    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status !== 'Chờ bưng') continue;
        const mi = menuById[item.menuItemId];
        const cat = categoryById[mi?.categoryId ?? ''];
        const m = minsSince(item.waitingSince);
        out.push({
          key: item.id,
          sessionId: session.id,
          orderId: order.id,
          itemId: item.id,
          tableName,
          name: item.name,
          qty: item.qty,
          categoryLabel: cat?.label ?? '',
          waitingSince: item.waitingSince ?? iso(),
          claimedBy: item.claimedBy,
          escalation: m > 5 ? 'manager' : m >= 3 ? 'khẩn' : 'thường',
        });
      }
    }
  }
  return out.sort((a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime());
}

function slaOf(queuedAt: string): 'bình thường' | 'sắp trễ' | 'trễ' {
  const m = minsSince(queuedAt);
  if (m > 15) return 'trễ';
  if (m >= 5) return 'sắp trễ';
  return 'bình thường';
}

function buildKitchenQueue(state: State): KitchenTicketItem[] {
  const raw: KitchenTicketItem[] = [];
  for (const session of state.sessions) {
    if (session.status !== 'Đang hoạt động') continue;
    const tableNames = tableNamesOf(state.tables, session.tableIds);
    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status !== 'Trong hàng đợi' && item.status !== 'Đang làm') continue;
        const mi = menuById[item.menuItemId];
        const cat = categoryById[mi?.categoryId ?? ''];
        raw.push({
          itemId: item.id,
          sessionId: session.id,
          orderId: order.id,
          tableNames,
          menuItemId: item.menuItemId,
          name: item.name,
          qty: item.qty,
          note: item.note,
          optionLabels: item.optionLabels,
          status: item.status,
          categoryId: mi?.categoryId ?? '',
          categoryLabel: cat?.label ?? '',
          course: (cat?.course ?? 'Món chính') as Course,
          queuedAt: item.queuedAt,
          sla: slaOf(item.queuedAt),
          mergedItemIds: [item.id],
        });
      }
    }
  }

  // Gom mẻ: cùng món + cùng option + cùng ghi chú + cùng trạng thái, cách nhau ≤5 phút.
  const sorted = [...raw].sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());
  const used = new Set<string>();
  const groupKey = (t: KitchenTicketItem) => `${t.menuItemId}|${t.optionLabels.join(',')}|${t.note ?? ''}|${t.status}`;
  const merged: KitchenTicketItem[] = [];
  for (const it of sorted) {
    if (used.has(it.itemId)) continue;
    const k = groupKey(it);
    const base = new Date(it.queuedAt).getTime();
    const bucket = sorted.filter(
      (o) => !used.has(o.itemId) && groupKey(o) === k && Math.abs(new Date(o.queuedAt).getTime() - base) <= 5 * 60_000,
    );
    bucket.forEach((b) => used.add(b.itemId));
    if (bucket.length === 1) {
      merged.push(it);
      continue;
    }
    merged.push({
      ...it,
      qty: bucket.reduce((sum, b) => sum + b.qty, 0),
      tableNames: Array.from(new Set(bucket.flatMap((b) => b.tableNames))),
      mergedItemIds: bucket.map((b) => b.itemId),
      queuedAt: bucket[0].queuedAt,
      sla: slaOf(bucket[0].queuedAt),
    });
  }

  const courseRank = (c: Course) => (c === 'Khai vị & đồ uống' ? 0 : 1);
  return merged.sort((a, b) => {
    const aLate = a.sla === 'trễ' ? 0 : 1;
    const bLate = b.sla === 'trễ' ? 0 : 1;
    if (aLate !== bLate) return aLate - bLate;
    const t = new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
    if (t !== 0) return t;
    return courseRank(a.course) - courseRank(b.course);
  });
}

export type KitchenTicket = {
  orderId: string;
  sessionId: string;
  tableNames: string[];
  items: OrderItem[];
  doneCount: number;
  totalCount: number;
  earliestQueuedAt: string;
};

function buildKitchenTickets(state: State): KitchenTicket[] {
  const out: KitchenTicket[] = [];
  for (const session of state.sessions) {
    if (session.status !== 'Đang hoạt động') continue;
    const tableNames = tableNamesOf(state.tables, session.tableIds);
    for (const order of session.orders) {
      const active = order.items.some((i) => i.status === 'Trong hàng đợi' || i.status === 'Đang làm');
      if (!active) continue;
      const countable = order.items.filter((i) => i.status !== 'Huỷ');
      const done = countable.filter((i) => !['Trong hàng đợi', 'Đang làm', 'Hết món'].includes(i.status)).length;
      out.push({
        orderId: order.id,
        sessionId: session.id,
        tableNames,
        items: order.items,
        doneCount: done,
        totalCount: countable.length,
        earliestQueuedAt: order.items.reduce(
          (min, i) => (i.queuedAt < min ? i.queuedAt : min),
          order.items[0]?.queuedAt ?? order.createdAt,
        ),
      });
    }
  }
  return out.sort((a, b) => new Date(a.earliestQueuedAt).getTime() - new Date(b.earliestQueuedAt).getTime());
}

export type OutOfStock = { itemId: string; sessionId: string; tableName: string; name: string };

function buildOutOfStock(state: State): OutOfStock[] {
  const out: OutOfStock[] = [];
  for (const session of state.sessions) {
    if (session.status !== 'Đang hoạt động') continue;
    const tableName = tableNamesOf(state.tables, session.tableIds).join(' + ');
    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status === 'Hết món') {
          out.push({ itemId: item.id, sessionId: session.id, tableName, name: item.name });
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
  kitchenQueue: KitchenTicketItem[];
  kitchenTickets: KitchenTicket[];
  checkIn: (role: StaffRole, user?: CurrentUser) => void;
  checkOut: () => void;
  setSimulate: (v: boolean) => void;
  setKitchenStationCategories: (categoryIds: string[]) => void;
  setKitchenView: (view: 'item' | 'ticket') => void;
  openSession: (tableIds: string[], guests: number) => void;
  mergeTableIntoSession: (sessionId: string, tableId: string) => void;
  moveSession: (sessionId: string, toTableIds: string[]) => void;
  cancelSession: (sessionId: string) => void;
  submitOrder: (sessionId: string, cart: CartLine[]) => void;
  patchItem: (itemId: string, patch: Partial<OrderItem>) => void;
  removeItem: (itemId: string) => void;
  setItemStatus: (itemId: string, status: OrderItemStatus) => void;
  claimItem: (itemId: string) => void;
  unclaimItem: (itemId: string) => void;
  serveItem: (itemId: string) => void;
  dropOutOfStockItem: (itemId: string) => void;
  resolveSwap: (itemId: string, newMenuItemId: string) => void;
  setMenuAvailability: (menuItemId: string, available: boolean) => void;
  setRemainingPortions: (menuItemId: string, value: number) => void;
  requestCheckout: (sessionId: string, method: 'Chuyển khoản QR' | 'Tiền mặt') => void;
  collectCash: (sessionId: string) => void;
  kitchenTick: () => void;
  tableById: (id: string) => Table | undefined;
  sessionByTable: (tableId: string) => TableSession | undefined;
  sessionById: (id: string) => TableSession | undefined;
  outOfStockFor: (sessionId: string) => OutOfStock[];
  isMenuAvailable: (menuItemId: string) => boolean;
  remainingPortionsOf: (menuItemId: string) => number | undefined;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  useEffect(() => {
    if (!state.simulate) return;
    const id = setInterval(() => {
      dispatch({ type: 'kitchenTick' });
      dispatch({ type: 'autoConfirmPayments' });
    }, 9000);
    return () => clearInterval(id);
  }, [state.simulate]);

  const value = useMemo<StoreValue>(() => {
    const outOfStock = buildOutOfStock(state);
    const claimQueue = buildClaimQueue(state);
    return {
      state,
      claimQueue,
      unclaimedCount: claimQueue.filter((c) => !c.claimedBy).length,
      outOfStock,
      kitchenQueue: buildKitchenQueue(state),
      kitchenTickets: buildKitchenTickets(state),
      checkIn: (role, user) => dispatch({ type: 'checkIn', role, user }),
      checkOut: () => dispatch({ type: 'checkOut' }),
      setSimulate: (value) => dispatch({ type: 'setSimulate', value }),
      setKitchenStationCategories: (categoryIds) =>
        dispatch({ type: 'setKitchenStationCategories', categoryIds }),
      setKitchenView: (view) => dispatch({ type: 'setKitchenView', view }),
      openSession: (tableIds, guests) => dispatch({ type: 'openSession', tableIds, guests }),
      mergeTableIntoSession: (sessionId, tableId) =>
        dispatch({ type: 'mergeTableIntoSession', sessionId, tableId }),
      moveSession: (sessionId, toTableIds) => dispatch({ type: 'moveSession', sessionId, toTableIds }),
      cancelSession: (sessionId) => dispatch({ type: 'cancelSession', sessionId }),
      submitOrder: (sessionId, cart) => dispatch({ type: 'submitOrder', sessionId, cart }),
      patchItem: (itemId, patch) => dispatch({ type: 'patchItem', itemId, patch }),
      removeItem: (itemId) => dispatch({ type: 'removeItem', itemId }),
      setItemStatus: (itemId, status) => dispatch({ type: 'setItemStatus', itemId, status }),
      claimItem: (itemId) => dispatch({ type: 'claimItem', itemId }),
      unclaimItem: (itemId) => dispatch({ type: 'unclaimItem', itemId }),
      serveItem: (itemId) => dispatch({ type: 'serveItem', itemId }),
      dropOutOfStockItem: (itemId) => dispatch({ type: 'dropOutOfStockItem', itemId }),
      resolveSwap: (itemId, newMenuItemId) => dispatch({ type: 'resolveSwap', itemId, newMenuItemId }),
      setMenuAvailability: (menuItemId, available) =>
        dispatch({ type: 'setMenuAvailability', menuItemId, available }),
      setRemainingPortions: (menuItemId, value) =>
        dispatch({ type: 'setRemainingPortions', menuItemId, value }),
      requestCheckout: (sessionId, method) => dispatch({ type: 'requestCheckout', sessionId, method }),
      collectCash: (sessionId) => dispatch({ type: 'collectCash', sessionId }),
      kitchenTick: () => dispatch({ type: 'kitchenTick' }),
      tableById: (id) => state.tables.find((t) => t.id === id),
      sessionByTable: (tableId) =>
        state.sessions.find((s) => s.tableIds.includes(tableId) && s.status === 'Đang hoạt động'),
      sessionById: (id) => state.sessions.find((s) => s.id === id),
      outOfStockFor: (sessionId) => outOfStock.filter((o) => o.sessionId === sessionId),
      isMenuAvailable: (menuItemId) => !state.unavailableMenu.includes(menuItemId),
      remainingPortionsOf: (menuItemId) => state.remainingPortions[menuItemId],
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/** Dòng món chỉ được sửa/huỷ khi còn ở hàng đợi (BR-09). */
export const EDITABLE_ITEM_STATUSES: OrderItemStatus[] = ['Trong hàng đợi'];

export function orderTotal(order: SessionOrder): number {
  return order.items
    .filter((i) => i.status !== 'Huỷ' && i.status !== 'Hết món')
    .reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function sessionTotal(session: TableSession): number {
  return session.orders.reduce((sum, o) => sum + orderTotal(o), 0);
}
