import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { GlassBackdrop, GlassCapture, WindowRect } from './types';

const BackdropSnapshotContext = createContext<GlassCapture>(async () => null);

/** Quá thời gian này mà chưa chụp xong thì mở dialog luôn, không có blur. */
const CAPTURE_TIMEOUT_MS = 500;

/** Chỉ ở dev: báo khi dialog phải mở không có blur, để biết vì sao. */
function warnFallback(reason: string) {
  if (__DEV__) console.warn(`[glass] Dialog mở không có blur — ${reason}`);
}

export function measureWindowRect(view: View): Promise<WindowRect> {
  return new Promise((resolve) => view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })));
}

/**
 * Bọc toàn bộ app để AppModal chụp được "màn hình phía sau" làm nền kính mờ.
 *
 * Chụp MỘT lần lúc mở dialog (react-native-view-shot) rồi hiển thị ảnh tĩnh đó đã blur (`Image`
 * `blurRadius`), thay vì blur trực tiếp mỗi khung hình như expo-blur trên Android (gây lag + lỗi vẽ trắng).
 *
 * Không dùng Skia ở đây (đã thử, Skia 2.2.12 trong Expo Go trên Android): `makeImageFromView` treo
 * promise, còn Canvas thỉnh thoảng không vẽ (mất blur lúc có lúc không).
 *
 * Lưu ý Android: ảnh chụp vẽ bằng software canvas → ảnh là hardware bitmap trong vùng chụp sẽ làm lần
 * chụp thất bại (dialog vẫn mở, chỉ mất blur). Vì vậy KHÔNG dùng expo-image (Glide mặc định tạo hardware
 * bitmap) cho các màn có thể nằm sau dialog — dùng `Image` của React Native.
 */
export function BackdropSnapshotRoot({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null);

  const capture = useCallback<GlassCapture>(async () => {
    const view = ref.current;
    if (!view) return null;
    const startedAt = Date.now();
    const work = (async () => {
      const rect = await measureWindowRect(view);
      // Chụp ở ~1 px/dp (thấp hơn độ phân giải thật vài lần): nhanh hơn nhiều, blur xong không thấy khác.
      const uri = await captureRef(ref, {
        format: 'jpg',
        quality: 0.8,
        result: 'data-uri',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      return { uri, ...rect } satisfies GlassBackdrop;
    })().catch((e: unknown) => {
      warnFallback(`chụp lỗi: ${String(e)}`);
      return null;
    });
    // Chụp chậm/treo thì vẫn mở dialog (không blur) thay vì kẹt.
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), CAPTURE_TIMEOUT_MS));
    const result = await Promise.race([work, timeout]);
    if (result === 'timeout') {
      void work.then(() => warnFallback(`chụp quá ${CAPTURE_TIMEOUT_MS}ms (xong sau ${Date.now() - startedAt}ms)`));
      return null;
    }
    return result;
  }, []);

  const value = useMemo(() => capture, [capture]);

  return (
    <BackdropSnapshotContext.Provider value={value}>
      <View ref={ref} collapsable={false} style={styles.root}>
        {children}
      </View>
    </BackdropSnapshotContext.Provider>
  );
}

/** Hàm chụp nền phía sau; trả `null` nếu không chụp được (khi đó kính chỉ còn lớp trắng mờ). */
export function useBackdropCapture(): GlassCapture {
  return useContext(BackdropSnapshotContext);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
