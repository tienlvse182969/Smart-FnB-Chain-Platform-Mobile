import { io, type Socket } from 'socket.io-client';

import { extraLabel, sizeOf } from '@/src/data/order-utils';
import type { CartLine } from '@/src/data/store';
import { SIZE_GROUP_ID, type OrderOption, type SelectedExtra } from '@/src/data/types';
import { API_ORIGIN } from '@/src/lib/api-client';
import { me } from '@/src/services/auth-api';
import { getTokens } from '@/src/services/token-storage';

export type DisplayState = 'IDLE' | 'CART' | 'PAYMENT_PENDING' | 'PAYMENT_QR' | 'PAID';

/** Tuỳ chọn (trừ size); `isDefault` để màn hình khách chỉ in đậm cái khác mặc định. */
export type DisplayDetailOption = { label: string; isDefault: boolean };
/** Topping của một ly/phần, `quantity` tính theo ly. */
export type DisplayDetailTopping = { name: string; quantity: number };

export type DisplayComboComponentDetail = {
  name: string;
  quantity: number;
  size?: string;
  options: DisplayDetailOption[];
  toppings: DisplayDetailTopping[];
};

/**
 * Chi tiết có cấu trúc cho màn hình khách: size tách riêng, topping, các món trong combo.
 * `options` dạng chữ vẫn giữ cho màn hình khách bản cũ.
 */
export type DisplayItemDetail = {
  size?: string;
  options: DisplayDetailOption[];
  toppings: DisplayDetailTopping[];
  /** có khi dòng là combo */
  components?: DisplayComboComponentDetail[];
};

export type DisplaySnapshot = {
  state: DisplayState;
  items: {
    key: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    options: string[];
    detail?: DisplayItemDetail;
    note?: string;
  }[];
  totalAmount: number;
  orderCode?: string;
  callNumber?: number;
  paymentMethod?: string;
  qrCode?: string;
  qrExpiresAt?: string;
};

/** Server từ chối kết nối (thường do access token hết hạn) → làm mới token rồi thử lại. */
const REJECTED_RETRY_MS = 3_000;
const MAX_REJECTED_RETRIES = 5;

let socket: Socket | null = null;
let rejectedRetries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
/** Bản mới nhất của từng quầy — gửi lại mỗi lần (nối lại) kết nối, không gửi dồn bản cũ. */
const latest = new Map<string, DisplaySnapshot>();

const send = (active: Socket, stationId: string, snapshot: DisplaySnapshot) =>
  active.emit('display:update', { stationId, snapshot });

/**
 * Một socket duy nhất cho cả phiên. `auth` là hàm nên mỗi lần nối lại đều đọc access token mới
 * nhất — token cố định lúc tạo socket sẽ hết hạn sau 15 phút và bị gateway từ chối.
 */
function connection() {
  if (socket) return socket;
  const active = io(`${API_ORIGIN}/operations`, {
    path: process.env.EXPO_PUBLIC_REALTIME_PATH || '/socket.io',
    auth: (cb) => {
      void getTokens()
        .then((tokens) => cb({ token: tokens?.accessToken ?? '' }))
        .catch(() => cb({ token: '' }));
    },
    transports: ['websocket'],
    reconnection: true,
  });

  active.on('connect', () => {
    rejectedRetries = 0;
    for (const [stationId, snapshot] of latest) send(active, stationId, snapshot);
  });
  active.on('disconnect', (reason) => {
    // gateway chủ động ngắt khi token không hợp lệ; socket.io không tự nối lại trường hợp này
    if (reason !== 'io server disconnect' || rejectedRetries >= MAX_REJECTED_RETRIES) return;
    rejectedRetries += 1;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      // request HTTP bị 401 → interceptor của apiClient tự đổi access token mới
      void me()
        .catch(() => undefined)
        .finally(() => {
          if (socket === active) active.connect();
        });
    }, REJECTED_RETRY_MS);
  });
  active.on('connect_error', (error) => console.warn('[customer-display] connect_error:', error.message));
  active.on('exception', (error) => console.warn('[customer-display] server exception:', error));

  socket = active;
  return active;
}

const detailOptions = (options: OrderOption[]): DisplayDetailOption[] =>
  options
    .filter((o) => o.groupId !== SIZE_GROUP_ID)
    .map((o) => ({ label: o.label, isDefault: o.isDefault }));

const detailToppings = (extras: SelectedExtra[] = []): DisplayDetailTopping[] =>
  extras.map((e) => ({ name: e.label, quantity: e.qty }));

function detailOf(line: CartLine): DisplayItemDetail {
  if (line.combo) {
    return {
      options: [],
      toppings: [],
      components: line.combo.components.map((c) => ({
        name: c.itemName,
        quantity: c.quantity,
        size: sizeOf(c.options)?.label,
        options: detailOptions(c.options),
        toppings: detailToppings(c.extras),
      })),
    };
  }
  return {
    size: sizeOf(line.options)?.label,
    options: detailOptions(line.options),
    toppings: detailToppings(line.extras),
  };
}

export function snapshotFromCart(cart: CartLine[]): DisplaySnapshot {
  return {
    state: cart.length ? 'CART' : 'IDLE',
    items: cart.map((line) => ({
      key: line.key,
      name: line.name,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.unitPrice * line.qty,
      options: line.combo
        ? line.combo.components.map((c) =>
            [
              `${c.quantity > 1 ? `${c.quantity}× ` : ''}${c.itemName}`,
              ...c.options.map((option) => option.label),
              ...c.extras.map(extraLabel),
            ].join(' · '),
          )
        : [...line.options.map((option) => option.label), ...(line.extras ?? []).map(extraLabel)],
      detail: detailOf(line),
      note: line.note,
    })),
    totalAmount: cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  };
}

/** Gửi trạng thái màn hình khách của quầy; chưa kết nối thì gửi ngay khi nối được. */
export async function updateCustomerDisplay(stationId: string, snapshot: DisplaySnapshot) {
  latest.set(stationId, snapshot);
  const active = connection();
  if (active.connected) send(active, stationId, snapshot);
}

/** Gọi khi đăng xuất — phiên sau dùng token của tài khoản mới. */
export function disconnectCustomerDisplay() {
  clearTimeout(retryTimer);
  rejectedRetries = 0;
  latest.clear();
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
