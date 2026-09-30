import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { login as loginRequest, logout as logoutRequest, me } from '@/src/services/auth-api';
import type { AuthUser } from '@/src/services/auth-types';
import { clearTokens, getTokens, saveTokens } from '@/src/services/token-storage';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
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
      })
      .catch(clearTokens)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email.trim().toLowerCase(), password);
    if (response.user.role !== 'CASHIER' && response.user.role !== 'BARISTA') {
      throw new Error('Ứng dụng này chỉ dành cho Thu ngân và Pha chế');
    }
    if (!response.user.employee) throw new Error('Tài khoản chưa được gán chi nhánh');
    await saveTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    const tokens = await getTokens();
    if (tokens) await logoutRequest(tokens.refreshToken).catch(() => undefined);
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
