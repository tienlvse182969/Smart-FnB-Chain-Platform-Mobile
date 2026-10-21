import { Provider as AntdProvider } from '@ant-design/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { me } from '@/src/services/auth-api';
import { getBranding, type RawBranding } from '@/src/services/branding-api';
import { buildBrandTheme, PLATFORM_BRAND, resolveBrand, type BrandTokens } from '@/src/theme/brand';
import { AppThemeContext, appLightTheme } from '@/src/theme/use-theme';

const CACHE_KEY = 'smartfnb.branding';
/** Chỉ nạp lại khi app quay về foreground nếu lần nạp trước cách quá chừng này (giống web). */
const REFRESH_INTERVAL_MS = 60_000;

type Cached = { userId: string; chainId: string | null; branding: RawBranding | null };

const BrandContext = createContext<BrandTokens>(PLATFORM_BRAND);

/** Nhận diện hiệu lực của phiên hiện tại; ngoài phiên đăng nhập (màn login) luôn là nhận diện nền tảng. */
export function useBrand(): BrandTokens {
  return useContext(BrandContext);
}

async function readCache(userId: string): Promise<Cached | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cached = raw ? (JSON.parse(raw) as Cached) : null;
    return cached?.userId === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(value: Cached) {
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value)).catch(() => undefined);
}

/**
 * Lấy nhận diện của chuỗi cho tài khoản đang đăng nhập và cấp theme (antd + app) đã áp màu chủ đạo.
 * Đặt BÊN TRONG `AuthProvider`; không có phiên đăng nhập thì theme gốc — nên màn đăng nhập không bị áp nhận diện.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [branding, setBranding] = useState<RawBranding | null>(null);
  const chainId = useRef<string | null>(null);
  const fetchedAt = useRef(0);
  const currentUserId = useRef<string | null>(null);
  currentUserId.current = userId;

  const refresh = useCallback(async (id: string) => {
    fetchedAt.current = Date.now();
    try {
      const chain = chainId.current ?? (await me()).chainId;
      const fresh = chain ? await getBranding(chain) : null;
      // Đã đăng xuất / đổi tài khoản trong lúc chờ thì bỏ kết quả.
      if (currentUserId.current !== id) return;
      chainId.current = chain;
      setBranding(fresh);
      writeCache({ userId: id, chainId: chain, branding: fresh });
    } catch {
      // Im lặng giữ bản cũ (mất mạng...). Cho phép thử lại ở lần về foreground kế tiếp.
      fetchedAt.current = 0;
    }
  }, []);

  useEffect(() => {
    chainId.current = null;
    fetchedAt.current = 0;
    setBranding(null);
    if (!userId) return;
    let active = true;
    // Áp bản lưu sẵn ngay để không nháy giao diện mặc định / dùng được khi mất mạng, rồi nạp bản mới.
    void readCache(userId).then((cached) => {
      if (!active || !cached) return;
      chainId.current ??= cached.chainId;
      setBranding((current) => current ?? cached.branding);
    });
    void refresh(userId);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - fetchedAt.current > REFRESH_INTERVAL_MS) void refresh(userId);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [userId, refresh]);

  const brand = useMemo(() => (userId ? resolveBrand(branding) : PLATFORM_BRAND), [userId, branding]);
  const theme = useMemo(() => buildBrandTheme(appLightTheme, brand), [brand]);

  return (
    <BrandContext.Provider value={brand}>
      <AppThemeContext.Provider value={theme}>
        <AntdProvider theme={theme}>{children}</AntdProvider>
      </AppThemeContext.Provider>
    </BrandContext.Provider>
  );
}
