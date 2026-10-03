import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRole } from '@/src/services/auth-types';

const STORAGE_KEY = 'smartfnb.recentAccounts';
const MAX_ACCOUNTS = 6;

/** Chỉ lưu thông tin hiển thị để chọn nhanh; không bao giờ lưu mật khẩu hay token. */
export type RecentAccount = {
  email: string;
  name: string;
  role: AppRole;
};

export async function loadRecentAccounts(): Promise<RecentAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is RecentAccount =>
        typeof a?.email === 'string' && typeof a?.name === 'string' && (a?.role === 'CASHIER' || a?.role === 'BARISTA'),
    );
  } catch {
    return [];
  }
}

async function save(accounts: RecentAccount[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // lưu thất bại chỉ làm mất gợi ý, không ảnh hưởng đăng nhập
  }
}

/** Đưa tài khoản vừa đăng nhập lên đầu danh sách. */
export async function rememberAccount(account: RecentAccount): Promise<RecentAccount[]> {
  const email = account.email.trim().toLowerCase();
  const next = [{ ...account, email }, ...(await loadRecentAccounts()).filter((a) => a.email !== email)].slice(0, MAX_ACCOUNTS);
  await save(next);
  return next;
}

export async function forgetAccount(email: string): Promise<RecentAccount[]> {
  const next = (await loadRecentAccounts()).filter((a) => a.email !== email);
  await save(next);
  return next;
}
