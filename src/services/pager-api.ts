import type { TFunction } from 'i18next';

import { apiClient } from '@/src/lib/api-client';
import { ApiError } from '@/src/services/auth-types';

/** Số máy báo rung vật lý hợp lệ theo backend (`AssignPagerDto`). */
export const PAGER_MIN = 1;
export const PAGER_MAX = 999;

/** Phản hồi chung của `PATCH /pager` và `POST /pager/notify` (cũng là payload realtime `order.pager.updated`). */
export type PagerUpdate = {
  id: string;
  branchId: string;
  status: string;
  callNumber: number | null;
  pagerNumber: number | null;
  pagerNotifiedAt: string | null;
};

/** Chuỗi nhập → số máy hợp lệ, hoặc `null` nếu không phải số nguyên 1–999. */
export function parsePagerNumber(input: string): number | null {
  const value = input.trim();
  if (!/^\d{1,3}$/.test(value)) return null;
  const number = Number(value);
  return number >= PAGER_MIN && number <= PAGER_MAX ? number : null;
}

/**
 * Thu ngân gán / đổi / gỡ (`null`) máy báo rung cho đơn quầy đã thanh toán và chưa hoàn tất
 * (SUBMITTED / PREPARING / READY). Đổi số sẽ xoá mốc "đã gọi" trước đó.
 */
export async function assignPager(orderId: string, pagerNumber: number | null) {
  const { data } = await apiClient.patch<PagerUpdate>(`/counter/orders/${orderId}/pager`, { pagerNumber });
  return data;
}

/**
 * Ghi nhận nhân viên đã bấm gọi máy báo rung (backend không phát tín hiệu phần cứng).
 * Chỉ hợp lệ khi đơn READY và vẫn gán đúng số máy này; gọi lại nhiều lần giữ mốc thời gian đầu.
 */
export async function notifyPager(orderId: string, pagerNumber: number) {
  const { data } = await apiClient.post<PagerUpdate>(`/counter/orders/${orderId}/pager/notify`, { pagerNumber });
  return data;
}

/** Thông điệp backend (tiếng Anh) → câu dễ hiểu cho nhân viên. */
export function pagerErrorMessage(reason: unknown, t: TFunction, pagerNumber?: number | null): string {
  if (reason instanceof ApiError) {
    if (/already assigned/i.test(reason.message)) return t('pager.errors.taken', { number: pagerNumber ?? '' });
    if (/paid open orders/i.test(reason.message)) return t('pager.errors.notOpen');
    if (/must be ready/i.test(reason.message)) return t('pager.errors.notReady');
    if (/between 1 and 999/i.test(reason.message) || reason.status === 400) return t('pager.errors.range');
    if (reason.status === 404) return t('pager.errors.notFound');
    if (reason.status === 403) return t('pager.errors.forbidden');
  }
  return reason instanceof Error ? reason.message : t('pager.errors.generic');
}
