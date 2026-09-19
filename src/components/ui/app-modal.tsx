import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from './button';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

/** Thông số spring của ArkUI HarmonyOS NEXT: interpolatingSpring(0, 1, 328, 34). */
const HARMONY_SPRING = { mass: 1, stiffness: 328, damping: 34 } as const;
const SCALE_FROM = 0.86;
const SCALE_TO = 0.94;
const EXIT_MS = 180;

type ModalAction = { text: string; onPress: () => void; primary?: boolean; disabled?: boolean };

/** Modal nội dung tuỳ biến — khung nhất quán, motion mô phỏng dialog HarmonyOS NEXT. */
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
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const dialogWidth = Math.min(maxWidth, width - 48);

  const [mounted, setMounted] = useState(visible);
  const scrim = useSharedValue(0);
  const scale = useSharedValue(SCALE_FROM);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scale.value = SCALE_FROM;
      scale.value = withSpring(1, HARMONY_SPRING);
      opacity.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
      scrim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    } else {
      const easing = Easing.bezier(0.2, 0, 0.2, 1);
      scale.value = withTiming(SCALE_TO, { duration: EXIT_MS, easing });
      scrim.value = withTiming(0, { duration: EXIT_MS, easing });
      opacity.value = withTiming(0, { duration: EXIT_MS, easing }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, scale, opacity, scrim]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="none"
      visible={mounted}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.fill_mask }, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              width: dialogWidth,
              backgroundColor: theme.fill_base,
              borderColor: theme.border_color_thin,
            },
            cardStyle,
          ]}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  icon: { alignItems: 'center', marginBottom: 10 },
  title: { marginBottom: 12, textAlign: 'center', fontFamily: fontFamily.semibold },
  content: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
});
