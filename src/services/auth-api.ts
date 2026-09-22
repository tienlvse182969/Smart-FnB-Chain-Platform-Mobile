import { apiClient } from '@/src/lib/api-client';

import type { AuthResponse, LoginPayload, MessageResponse } from './auth-types';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(refreshToken: string): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/auth/logout', { refreshToken });
  return data;
}
