import { io, type Socket } from 'socket.io-client';

import type { CartLine } from '@/src/data/store';
import { API_BASE_URL } from '@/src/lib/api-client';
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

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;

function apiOrigin() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

async function connection() {
  if (socket?.connected) return socket;
  if (connecting) return connecting;
  connecting = (async () => {
    const tokens = await getTokens();
    if (!tokens) return null;
    socket?.disconnect();
    socket = io(`${apiOrigin()}/operations`, {
      path: process.env.EXPO_PUBLIC_REALTIME_PATH || '/socket.io',
      auth: { token: tokens.accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    return socket;
  })().finally(() => {
    connecting = null;
  });
  return connecting;
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

export async function updateCustomerDisplay(stationId: string, snapshot: DisplaySnapshot) {
  const active = await connection();
  active?.emit('display:update', { stationId, snapshot });
}

export function disconnectCustomerDisplay() {
  socket?.disconnect();
  socket = null;
}
