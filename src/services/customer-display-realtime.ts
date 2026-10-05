import { io, type Socket } from 'socket.io-client';

import type { CartLine } from '@/src/data/store';
import { API_BASE_URL } from '@/src/lib/api-client';
import { me } from '@/src/services/auth-api';
import { getTokens } from '@/src/services/token-storage';

export type DisplayState = 'IDLE' | 'CART' | 'PAYMENT_PENDING' | 'PAYMENT_QR' | 'PAID';

export type DisplaySnapshot = {
  state: DisplayState;
  items: {
    key: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    options: string[];
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

function apiOrigin() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

const send = (active: Socket, stationId: string, snapshot: DisplaySnapshot) =>
  active.emit('display:update', { stationId, snapshot });

/**
 * Một socket duy nhất cho cả phiên. `auth` là hàm nên mỗi lần nối lại đều đọc access token mới
 * nhất — token cố định lúc tạo socket sẽ hết hạn sau 15 phút và bị gateway từ chối.
 */
function connection() {
  if (socket) return socket;
  const active = io(`${apiOrigin()}/operations`, {
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

export function snapshotFromCart(cart: CartLine[]): DisplaySnapshot {
  return {
    state: cart.length ? 'CART' : 'IDLE',
    items: cart.map((line) => ({
      key: line.key,
      name: line.name,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.unitPrice * line.qty,
      options: line.options.map((option) => option.label),
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
