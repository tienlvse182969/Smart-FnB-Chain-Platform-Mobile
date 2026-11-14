import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { login as loginRequest, logout as logoutRequest, me } from '@/src/services/auth-api';
import type { AuthUser } from '@/src/services/auth-types';
import { disconnectCustomerDisplay } from '@/src/services/customer-display-realtime';
import { clearTokens, getTokens, saveTokens } from '@/src/services/token-storage';
import { loadRecentAccounts } from './recent-accounts';

/** Họ tên nhân viên từ phản hồi đăng nhập; rỗng nếu backend không gửi. */
export const employeeFullName = (user: AuthUser) =>
  user.employee ? `${user.employee.firstName} ${user.employee.lastName}`.trim() : '';

type AuthContextValue = {
  user: AuthUser | null;
  /**
   * Tên hiển thị của tài khoản (họ tên nhân viên). `/auth/me` không trả họ tên, nên khi khôi phục
   * phiên thì lấy từ danh sách tài khoản đã đăng nhập gần đây; không có thì `null` (dùng email).
   */
  displayName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTokens()
      .then(async (tokens) => {
        if (!tokens) return;
        const context = await me();
        if (context.role !== 'CASHIER' && context.role !== 'BARISTA') throw new Error('Unsupported mobile role');
        setUser({
          id: context.id, email: context.email, phone: context.phone, status: 'ACTIVE', role: context.role,
          employee: context.employeeId && context.branchId ? { id: context.employeeId, employeeCode: '', branchId: context.branchId, firstName: '', lastName: '' } : null,
        });
        const email = context.email.trim().toLowerCase();
        const remembered = (await loadRecentAccounts()).find((a) => a.email === email);
        setDisplayName(remembered && remembered.name !== remembered.email ? remembered.name : null);
      })
      .catch(clearTokens)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email.trim().toLowerCase(), password);
    if (response.user.role !== 'CASHIER' && response.user.role !== 'BARISTA') {
      throw new Error('Ứng dụng này chỉ dành cho Thu ngân và Bếp & pha chế');
    }
    if (!response.user.employee) throw new Error('Tài khoản chưa được gán chi nhánh');
    await saveTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    setDisplayName(employeeFullName(response.user) || null);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    const tokens = await getTokens();
    if (tokens) await logoutRequest(tokens.refreshToken).catch(() => undefined);
    disconnectCustomerDisplay();
    await clearTokens();
    setUser(null);
    setDisplayName(null);
  }, []);

  const value = useMemo(
    () => ({ user, displayName, loading, login, logout }),
    [user, displayName, loading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
