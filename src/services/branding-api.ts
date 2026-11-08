import { absoluteAssetUrl, apiClient } from '@/src/lib/api-client';
import { ApiError } from '@/src/services/auth-types';

/** `GET /restaurant-chains/:chainId/branding` — nhận diện do Owner cấu hình trên web. */
export type RawBranding = {
  chainId: string;
  displayName: string;
  /** Đường dẫn tương đối `/uploads/branding/<file>` (hoặc URL tuyệt đối do Owner dán trước đây). */
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
};

/**
 * Trả `null` khi vai trò hoặc gói của chuỗi không được dùng nhận diện riêng (403, gồm `PLAN_FEATURE_NOT_ENABLED`):
 * đó không phải lỗi, app giữ giao diện mặc định (BR-44).
 */
export async function getBranding(chainId: string): Promise<RawBranding | null> {
  try {
    const { data } = await apiClient.get<RawBranding>(`/restaurant-chains/${chainId}/branding`);
    return data;
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 403) return null;
    throw failure;
  }
}

/** Đường dẫn tương đối → URL tuyệt đối theo gốc máy chủ; URL tuyệt đối/`data:` giữ nguyên; rỗng → `undefined`. */
export const absoluteLogoUrl = absoluteAssetUrl;
