import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRole } from './auth-types';

const STORAGE_KEY = 'smart_fnb.rememberedAccounts';
const MAX_ACCOUNTS = 5;

export type RememberedAccount = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  branchId?: string;
};

export async function listRememberedAccounts(): Promise<RememberedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertRememberedAccount(account: RememberedAccount): Promise<RememberedAccount[]> {
  const existing = await listRememberedAccounts();
  const next = [account, ...existing.filter((a) => a.id !== account.id)].slice(0, MAX_ACCOUNTS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeRememberedAccount(id: string): Promise<RememberedAccount[]> {
  const existing = await listRememberedAccounts();
  const next = existing.filter((a) => a.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
