import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@/src/lib/api-client';
import type { DisplaySnapshot } from '@/src/services/customer-display-realtime';

const DEVICE_TOKEN_KEY = 'smartfnb.customerDisplay.deviceToken';
const MODE_KEY = 'smartfnb.deviceMode';
const http = create({ baseURL: API_BASE_URL, timeout: 15_000 });

export type PairingCode = { code: string; deviceToken: string; expiresAt: string };
export type CustomerDisplayContext = {
  station: { id: string; name: string };
  branch: { id: string; name: string };
  currency: string;
  branding: { displayName: string; logoUrl: string | null; primaryColor: string; secondaryColor: string; accentColor: string };
  version: number;
  snapshot: DisplaySnapshot;
};

export const customerDisplayStorage = {
  getMode: () => SecureStore.getItemAsync(MODE_KEY),
  setMode: (mode: 'STAFF' | 'CUSTOMER_DISPLAY') => SecureStore.setItemAsync(MODE_KEY, mode),
  getToken: () => SecureStore.getItemAsync(DEVICE_TOKEN_KEY),
  saveToken: (token: string) => SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token),
  clear: () => Promise.all([SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY), SecureStore.deleteItemAsync(MODE_KEY)]),
};

export async function createCustomerDisplayPairing(): Promise<PairingCode> {
  const { data } = await http.post<PairingCode>('/device-pairing/codes', { deviceType: 'CUSTOMER_DISPLAY' });
  await customerDisplayStorage.saveToken(data.deviceToken);
  return data;
}

export async function getCustomerDisplayContext(token: string): Promise<CustomerDisplayContext> {
  const { data } = await http.get<CustomerDisplayContext>('/public/customer-display/context', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export function connectCustomerDisplay(
  token: string,
  onSnapshot: (snapshot: DisplaySnapshot, version?: number) => void,
  onRevoked: () => void,
): Socket {
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const socket = io(`${origin}/operations`, {
    path: process.env.EXPO_PUBLIC_REALTIME_PATH || '/socket.io',
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });
  socket.on('connect', () => socket.emit('station:sync'));
  socket.on('operations.updated', (event: { type?: string; data?: DisplaySnapshot & { version?: number } }) => {
    if (!event.data || !['display.update', 'station.sync'].includes(event.type ?? '')) return;
    onSnapshot(event.data, event.data.version);
  });
  socket.on('device.revoked', onRevoked);
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') onRevoked();
  });
  return socket;
}
