import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

const notificationSound = require('@/assets/sounds/notification.mp3');
const VISIBLE_MS = 4500;

type BannerEntry = { key: string; callNumber: number; summary: string; more: number };

/** Đơn mới thanh toán xong → hiện banner + phát âm thanh cho Barista (BA-01). */
export function NewOrderBanner() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const player = useAudioPlayer(notificationSound);

  const seenIds = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<BannerEntry[]>([]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    const queued = state.orders.filter(
      (o) => (o.status === 'Đã thanh toán' || o.status === 'Đang pha') && o.callNumber !== undefined,
    );
    const currentIds = new Set(queued.map((o) => o.id));
    // lần đầu chỉ ghi nhận đơn đang có, không báo — chỉ báo đơn thanh toán sau đó
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }
    const arrived = queued.filter((o) => !seenIds.current!.has(o.id));
    seenIds.current = currentIds;
    if (arrived.length === 0) return;

    setQueue((q) => [
      ...q,
      ...arrived.map((o) => ({
        key: o.id,
        callNumber: o.callNumber!,
        summary: `${o.lines[0].qty} × ${o.lines[0].name}`,
        more: o.lines.length - 1,
      })),
    ]);
    player.seekTo(0);
    player.play();
  }, [state.orders, player]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 16 }).start();
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key]);

  function dismiss() {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setQueue((q) => q.slice(1));
    });
  }

  if (!current) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 10 }]}>
      <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
        <Pressable
          onPress={() => {
            dismiss();
            router.replace('/(barista)/queue');
          }}
          style={[styles.banner, { backgroundColor: theme.fill_base, borderColor: theme.color_text_base }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.brand_primary }]}>
            <Icon name="bell" size={20} color={theme.color_text_base_inverse} />
          </View>
          <View style={styles.textWrap}>
            <Txt variant="bodyStrong">
              {t('baristaQueue.newOrderBanner', { call: String(current.callNumber).padStart(3, '0') })}
            </Txt>
            <Txt variant="label" muted numberOfLines={1}>
              {current.summary}
              {current.more > 0 ? ` · ${t('baristaQueue.newOrderMore', { count: current.more })}` : ''}
            </Txt>
          </View>
          <Pressable hitSlop={8} onPress={dismiss}>
            <Icon name="close" size={16} color={theme.color_text_caption} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 420,
    minWidth: 280,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
});
