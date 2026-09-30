import { apiClient } from '@/src/lib/api-client';
import type { AuthResponse, AuthUser } from '@/src/services/auth-types';

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function me() {
  const { data } = await apiClient.get<AuthUser & { employeeId: string | null; branchId: string | null }>('/auth/me');
  return data;
}

export async function logout(refreshToken: string) {
  await apiClient.post('/auth/logout', { refreshToken });
}
