import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Portal } from '@ant-design/react-native';

import { fontFamily } from '@/src/theme/typography';
import { Btn } from './button';
import { useBackdropCapture } from './glass/backdrop-snapshot';
import { GlassLayer } from './glass/glass-layer';
import type { GlassBackdrop, WindowRect } from './glass/types';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

type ModalAction = { text: string; onPress: () => void; primary?: boolean; disabled?: boolean };

/** Độ nhoè của nền kính (dp trên màn hình / px blur trên web). */
const GLASS_BLUR = 26;
/** Lớp trắng phủ trên nền đã blur — tăng để đục hơn/dễ đọc hơn, giảm để trong hơn. */
const GLASS_VEIL = 'rgba(255,255,255,0.78)';
const GLASS_BORDER = 'rgba(255,255,255,0.7)';
/** Lớp tối phủ phần màn hình phía sau (không blur). */
const BACKDROP = 'rgba(0,0,0,0.3)';
const ENTER_MS = 220;
const EXIT_MS = 160;

/**
 * Modal dựng trên antd `Portal` — khung dialog kiểu kính mờ, nền phía sau chỉ phủ tối nhẹ.
 *
 * Kính mờ: lúc mở, chụp màn hình phía sau MỘT lần rồi blur ảnh tĩnh đó trong khung
 * (xem `glass/`). Web dùng CSS `backdrop-filter`.
 *
 * Vẫn render qua portal của antd `Provider` như trước, nên nội dung modal nằm ngoài các provider
 * bọc bên trong `Provider` (vd. `StoreProvider`) — component con không được gọi `useStore()`.
 */
export function AppModal({
  visible,
  title,
  icon,
  onClose,
  children,
  actions,
  maxWidth = 460,
}: {
  visible: boolean;
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  actions?: ModalAction[];
  maxWidth?: number;
}) {
  const { width } = useWindowDimensions();
  const dialogWidth = Math.min(maxWidth, width - 48);
  const capture = useBackdropCapture();

  // Giữ modal trong cây thêm một nhịp sau khi `visible` = false để chạy hiệu ứng đóng.
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  mountedRef.current = mounted;
  const [backdrop, setBackdrop] = useState<GlassBackdrop | null>(null);
  const [frame, setFrame] = useState<Pick<WindowRect, 'x' | 'y'> | null>(null);
  const wrapperRef = useRef<View>(null);
  const progress = useSharedValue(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mở: chụp màn hình phía sau TRƯỚC khi dialog xuất hiện (nếu không ảnh chụp sẽ dính chính dialog).
  // Mở lại khi đang chạy hiệu ứng đóng thì giữ ảnh cũ.
  useEffect(() => {
    if (!visible || mountedRef.current) return;
    let cancelled = false;
    capture().then((shot) => {
      if (cancelled) return;
      setBackdrop(shot);
      setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, capture]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, mounted, progress]);

  // Đóng hẳn → bỏ ảnh chụp cũ (lần mở sau chụp lại màn hình mới).
  useEffect(() => {
    if (mounted) return;
    setBackdrop(null);
    setFrame(null);
  }, [mounted]);

  // Nút back Android: listener đăng ký sau chạy trước → modal chồng trên cùng đóng trước.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  // Vị trí khung trên màn hình = vị trí lớp phủ + layout của khung (chưa tính scale của hiệu ứng mở).
  const onDialogLayout = (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    wrapperRef.current?.measureInWindow((wx, wy) => setFrame({ x: wx + x, y: wy + y }));
  };

  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  if (!mounted) return null;

  return (
    <Portal>
      <View ref={wrapperRef} style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, fadeStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
          pointerEvents="box-none">
          <Animated.View onLayout={onDialogLayout} style={[styles.dialog, { width: dialogWidth }, dialogStyle]}>
            <GlassLayer frame={frame} backdrop={backdrop} blur={GLASS_BLUR} veil={GLASS_VEIL} />
            <View style={styles.body}>
              {icon ? (
                <View style={styles.icon}>
                  <Icon name={icon} size={32} />
                </View>
              ) : null}
              <Txt variant="h2" style={styles.title}>
                {title}
              </Txt>
              <View style={styles.content}>{children}</View>
              {actions && actions.length > 0 ? (
                <View style={styles.actions}>
                  {actions.map((a) => (
                    <Btn
                      key={a.text}
                      label={a.text}
                      onPress={a.onPress}
                      disabled={a.disabled}
                      variant={a.primary ? 'primary' : 'ghost'}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: BACKDROP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialog: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
  },
  body: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  icon: { alignItems: 'center', marginBottom: 10 },
  title: { marginBottom: 12, textAlign: 'center', fontFamily: fontFamily.semibold },
  content: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
});
