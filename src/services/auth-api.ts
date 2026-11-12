import { apiClient } from '@/src/lib/api-client';
import type { AuthResponse, AuthUser } from '@/src/services/auth-types';

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function me() {
  const { data } = await apiClient.get<AuthUser & { employeeId: string | null; branchId: string | null; chainId: string | null }>('/auth/me');
  return data;
}

export async function logout(refreshToken: string) {
  await apiClient.post('/auth/logout', { refreshToken });
}

/**
 * Thu ngân / Pha chế tự yêu cầu đặt lại mật khẩu (public, không cần token).
 * BE luôn trả 202 với cùng một câu thông báo (kể cả email không tồn tại); quá 5 lần/giờ/IP → 429.
 * Email chứa link web `/setup-password?token=…` (hiệu lực 30 phút) để đặt mật khẩu mới.
 */
export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post<{ message: string }>('/auth/password-reset-requests', { email: email.trim().toLowerCase() });
  return data;
}
