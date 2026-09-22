import axios, { AxiosError } from 'axios';

import { ApiError } from '@/src/services/auth-types';

/**
 * Chuẩn hoá EXPO_PUBLIC_API_URL về đúng gốc origin, dù người dùng đặt kèm "/api",
 * "/api/v1" hay dấu "/" thừa ở cuối — tránh nối lặp thành ".../api/api/v1".
 */
const normalizeOrigin = (url: string) =>
  url.trim().replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/i, '');

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100';

export const apiClient = axios.create({
  baseURL: `${normalizeOrigin(rawBaseUrl)}/api/v1`,
  // Render free-tier có thể "ngủ" — lần gọi đầu sau khi rảnh có thể mất 20-50s để cold-start.
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type BackendErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorBody>) => {
    if (error.response) {
      const body = error.response.data;
      const rawMessage = body?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage ?? error.message;
      return Promise.reject(new ApiError(error.response.status, message));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(0, 'timeout'));
    }
    return Promise.reject(new ApiError(0, 'network'));
  },
);
