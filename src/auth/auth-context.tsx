import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { StaffRole } from '@/src/data/types';
import { login as apiLogin, logout as apiLogout } from '@/src/services/auth-api';
import { AppRole, type AuthUser } from '@/src/services/auth-types';
import {
  listRememberedAccounts,
  removeRememberedAccount,
  upsertRememberedAccount,
  type RememberedAccount,
} from '@/src/services/remembered-accounts';
import { clearTokens, getTokens, saveTokens } from '@/src/services/token-storage';

export class UnsupportedRoleError extends Error {
  role: AppRole;

  constructor(role: AppRole) {
    super(`Unsupported role: ${role}`);
    this.name = 'UnsupportedRoleError';
    this.role = role;
  }
}

const ROLE_TO_STAFF_ROLE: Partial<Record<AppRole, StaffRole>> = {
  [AppRole.WAITER]: 'Phục vụ',
  [AppRole.KITCHEN]: 'Bếp',
};

export function staffRoleForAppRole(role: AppRole): StaffRole | null {
  return ROLE_TO_STAFF_ROLE[role] ?? null;
}

export function authUserDisplayName(user: AuthUser): string {
  const profile = user.employee ?? user.owner;
  if (profile) return `${profile.firstName} ${profile.lastName}`.trim();
  return user.email;
}

type AuthContextValue = {
  rememberedAccounts: RememberedAccount[];
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  forgetAccount: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const [refreshTokenInUse, setRefreshTokenInUse] = useState<string | null>(null);

  useEffect(() => {
    listRememberedAccounts().then(setRememberedAccounts);
    getTokens().then((tokens) => setRefreshTokenInUse(tokens?.refreshToken ?? null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin({ email: email.trim().toLowerCase(), password });

    if (!staffRoleForAppRole(result.user.role)) {
      apiLogout(result.refreshToken).catch(() => {});
      throw new UnsupportedRoleError(result.user.role);
    }

    await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setRefreshTokenInUse(result.refreshToken);

    const account: RememberedAccount = {
      id: result.user.id,
      email: result.user.email,
      displayName: authUserDisplayName(result.user),
      role: result.user.role,
      branchId: result.user.employee?.branchId,
    };
    const next = await upsertRememberedAccount(account);
    setRememberedAccounts(next);

    return result.user;
  }, []);

  const logout = useCallback(async () => {
    if (refreshTokenInUse) {
      try {
        await apiLogout(refreshTokenInUse);
      } catch {
        // đăng xuất cục bộ vẫn tiếp tục dù gọi backend lỗi (mất mạng, token đã hết hạn, ...)
      }
    }
    await clearTokens();
    setRefreshTokenInUse(null);
  }, [refreshTokenInUse]);

  const forgetAccount = useCallback(async (id: string) => {
    const next = await removeRememberedAccount(id);
    setRememberedAccounts(next);
  }, []);

  return (
    <AuthContext.Provider value={{ rememberedAccounts, login, logout, forgetAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
