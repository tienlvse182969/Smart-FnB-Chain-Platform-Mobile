import { create, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { ApiError, type AuthResponse } from '@/src/services/auth-types';
import { clearTokens, getTokens, saveTokens } from '@/src/services/token-storage';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3100/api/v1';

export const apiClient = create({ baseURL, timeout: 15_000 });
const refreshClient = create({ baseURL, timeout: 15_000 });

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (reason: AxiosError<{ message?: string | string[] }>) => {
    const original = reason.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (reason.response?.status === 401 && original && !original._retried && !original.url?.endsWith('/auth/refresh')) {
      original._retried = true;
      refreshPromise ??= rotateAccessToken().finally(() => { refreshPromise = null; });
      try {
        original.headers.Authorization = `Bearer ${await refreshPromise}`;
        return apiClient.request(original);
      } catch {
        await clearTokens();
      }
    }
    const raw = reason.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : raw ?? reason.message ?? 'Không thể kết nối máy chủ';
    throw new ApiError(reason.response?.status ?? 0, message);
  },
);

async function rotateAccessToken() {
  const tokens = await getTokens();
  if (!tokens) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn');
  const { data } = await refreshClient.post<AuthResponse>('/auth/refresh', { refreshToken: tokens.refreshToken });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}
