import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Portal } from '@ant-design/react-native';
import { BlurView } from 'expo-blur';

import { fontFamily } from '@/src/theme/typography';
import { Btn } from './button';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

type ModalAction = { text: string; onPress: () => void; primary?: boolean; disabled?: boolean };

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * Lớp trắng của kính lấy từ chính `tint` của BlurView, KHÔNG dùng View trắng riêng đè lên:
 * expo-blur SDK 54 trên Android chụp cả các view nằm trên BlurView vào ảnh blur, nên một lớp
 * trắng riêng sẽ bị blur ngược vào nền → khung trắng đục, mất hiệu ứng. Overlay của `tint` do
 * native tự vẽ nên không bị chụp.
 *
 * Với tint này lớp trắng ≈ 0.97 × intensity / 100 (Android, web); iOS dùng material tương ứng.
 * Tăng intensity → đục hơn, dễ đọc hơn; giảm → trong hơn. Android blur bán kính = intensity / 4.
 */
const GLASS_TINT = 'systemChromeMaterialLight';
const GLASS_INTENSITY = 82;
const GLASS_BORDER = 'rgba(255,255,255,0.7)';
/** Lớp tối phủ phần màn hình phía sau (không blur). */
const BACKDROP = 'rgba(0,0,0,0.3)';
const ENTER_MS = 220;
const EXIT_MS = 160;

/**
 * Modal dựng trên antd `Portal` — khung dialog kiểu kính mờ (expo-blur blur phần nằm sau khung),
 * nền phía sau chỉ phủ tối nhẹ thay cho mask đen 50% cố định của antd `Modal`.
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

  // Giữ modal trong cây thêm một nhịp sau khi `visible` = false để chạy hiệu ứng đóng.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, progress]);

  // Nút back Android: listener đăng ký sau chạy trước → modal chồng trên cùng đóng trước.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // Khung chỉ scale, không đổi opacity: iOS render sai blur khi opacity của view cha thay đổi.
  // Blur + lớp trắng của tint hiện dần qua `intensity`, nội dung hiện dần qua opacity của chính nó.
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + progress.value * 0.04 }] }));
  const blurProps = useAnimatedProps(() => ({ intensity: progress.value * GLASS_INTENSITY }));

  if (!mounted) return null;

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, fadeStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
          pointerEvents="box-none">
          <Animated.View style={[styles.dialog, { width: dialogWidth }, scaleStyle]}>
            <AnimatedBlurView
              animatedProps={blurProps}
              tint={GLASS_TINT}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.body, fadeStyle]}>
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
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: BACKDROP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // borderRadius đặt lên BlurView không có tác dụng — bo góc bằng overflow: 'hidden' ở khung cha.
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
