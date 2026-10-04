import { apiClient } from '@/src/lib/api-client';
import { ApiError } from './auth-types';

/**
 * Ghép màn hình phía khách với quầy bằng mã OTP 6 số (đặc tả v9.1, mục 11.10, BR-45).
 * Backend chưa có API ghép → mặc định chạy mock. Khi backend xong, đặt
 * `EXPO_PUBLIC_DISPLAY_PAIRING_MOCK=false` để gọi API thật.
 */
const USE_MOCK = process.env.EXPO_PUBLIC_DISPLAY_PAIRING_MOCK !== 'false';
export const isPairingMock = USE_MOCK;

/** Một quầy nhập sai quá 5 lần liên tiếp thì bị khoá ghép 5 phút (BR-45). */
export const MAX_PAIRING_FAILURES = 5;
export const PAIRING_LOCK_MS = 5 * 60_000;

export type CustomerDisplay = {
  deviceId: string;
  /** ISO time */
  pairedAt: string;
};

export type PairingErrorKind = 'invalid' | 'expired' | 'locked' | 'network';

export class DisplayPairingError extends Error {
  constructor(
    public readonly kind: PairingErrorKind,
    message: string,
    /** epoch ms — chỉ có khi `kind === 'locked'` */
    public readonly retryAt?: number,
    /** số lần còn được nhập sai trước khi bị khoá */
    public readonly attemptsLeft?: number,
  ) {
    super(message);
    this.name = 'DisplayPairingError';
  }
}

export async function pairCustomerDisplay(stationId: string, code: string): Promise<CustomerDisplay> {
  if (USE_MOCK) return mockPair(stationId, code);
  try {
    const { data } = await apiClient.post<CustomerDisplay>(`/stations/${stationId}/display-pairing`, { code });
    return data;
  } catch (reason) {
    if (!(reason instanceof ApiError)) throw reason;
    if (reason.status === 429) throw new DisplayPairingError('locked', reason.message, Date.now() + PAIRING_LOCK_MS);
    if (reason.status === 410) throw new DisplayPairingError('expired', reason.message);
    if (reason.status === 400 || reason.status === 404) throw new DisplayPairingError('invalid', reason.message);
    if (reason.status === 0) throw new DisplayPairingError('network', reason.message);
    throw reason;
  }
}

/** Màn hình khách đang ghép với quầy (null = chưa ghép). */
export async function getCustomerDisplay(stationId: string): Promise<CustomerDisplay | null> {
  if (USE_MOCK) return mockDisplays.get(stationId) ?? null;
  const { data } = await apiClient.get<CustomerDisplay | null>(`/stations/${stationId}/display`);
  return data;
}

// ---- mock: mô phỏng đúng luật của server để dựng giao diện trước ----
// 000000 = sai mã, 111111 = mã đã hết hạn; mã khác = ghép thành công.
const mockDisplays = new Map<string, CustomerDisplay>();
const mockFailures = new Map<string, { count: number; lockedUntil?: number }>();

function mockPair(stationId: string, code: string): Promise<CustomerDisplay> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      const now = Date.now();
      const entry = mockFailures.get(stationId) ?? { count: 0 };
      if (entry.lockedUntil && entry.lockedUntil > now) {
        reject(new DisplayPairingError('locked', 'Quầy đang bị khoá ghép', entry.lockedUntil));
        return;
      }
      if (code === '000000' || code === '111111') {
        const count = entry.lockedUntil ? 1 : entry.count + 1;
        if (count >= MAX_PAIRING_FAILURES) {
          const lockedUntil = now + PAIRING_LOCK_MS;
          mockFailures.set(stationId, { count, lockedUntil });
          reject(new DisplayPairingError('locked', 'Quầy đang bị khoá ghép', lockedUntil));
          return;
        }
        mockFailures.set(stationId, { count });
        const kind = code === '111111' ? 'expired' : 'invalid';
        reject(new DisplayPairingError(kind, kind, undefined, MAX_PAIRING_FAILURES - count));
        return;
      }
      mockFailures.delete(stationId);
      // ghép máy mới thì máy cũ của quầy bị thu hồi — mỗi quầy tối đa một màn hình khách
      const display = { deviceId: `mock-display-${now}`, pairedAt: new Date(now).toISOString() };
      mockDisplays.set(stationId, display);
      resolve(display);
    }, 600),
  );
}
