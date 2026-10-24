import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CounterOrder, PayosPayment } from './cashier-api';

const KEY_PREFIX = 'smartfnb.pending-payos';

export type PendingPayosCheckout = {
  userId: string;
  branchId: string;
  stationId: string;
  order: CounterOrder;
  payment: PayosPayment;
  savedAt: string;
};

const key = (userId: string, branchId: string) => `${KEY_PREFIX}.${userId}.${branchId}`;

export async function savePendingPayosCheckout(value: PendingPayosCheckout) {
  await AsyncStorage.setItem(key(value.userId, value.branchId), JSON.stringify(value));
}

export async function loadPendingPayosCheckout(userId: string, branchId: string) {
  const raw = await AsyncStorage.getItem(key(userId, branchId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PendingPayosCheckout;
    if (
      value.userId !== userId ||
      value.branchId !== branchId ||
      !value.order?.id ||
      !value.payment?.id
    ) {
      await AsyncStorage.removeItem(key(userId, branchId));
      return null;
    }
    return value;
  } catch {
    await AsyncStorage.removeItem(key(userId, branchId));
    return null;
  }
}

export async function clearPendingPayosCheckout(userId: string, branchId: string) {
  await AsyncStorage.removeItem(key(userId, branchId));
}
