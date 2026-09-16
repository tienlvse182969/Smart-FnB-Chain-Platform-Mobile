import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { staffByRole } from '@/src/data/mock';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from '../ui/icon';
import { Txt } from '../ui/txt';

type Dest = {
  href: '/(kitchen)/queue' | '/(kitchen)/menu' | '/(kitchen)/shift';
  match: string;
  label: string;
  icon: IconName;
};

const DESTS: Dest[] = [
  { href: '/(kitchen)/queue', match: '/queue', label: 'Hàng đợi', icon: 'bell' },
  { href: '/(kitchen)/menu', match: '/menu', label: 'Món ăn', icon: 'receipt' },
  { href: '/(kitchen)/shift', match: '/shift', label: 'Ca làm', icon: 'shift' },
];

/** Nav riêng cho Kitchen — chữ/nút to hơn hẳn Waiter (mục 4.7: đọc lướt, tay bẩn, đứng xa). */
export function KitchenNav() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View
      style={[
        styles.rail,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 14,
          backgroundColor: theme.fill_base,
          borderRightColor: theme.border_color_thin,
        },
      ]}>
      <View style={styles.brand}>
        <Icon name="chefHat" size={30} />
      </View>

      <View style={styles.destList}>
        {DESTS.map((d) => {
          const active = pathname.includes(d.match);
          const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
          return (
            <Pressable
              key={d.href}
              onPress={() => router.replace(d.href)}
              style={[styles.dest, active && { backgroundColor: theme.brand_primary }]}>
              <Icon name={d.icon} size={30} color={fg} />
              <Txt variant="bodyStrong" color={fg} style={styles.label} numberOfLines={2}>
                {d.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="label" muted style={styles.staffName} numberOfLines={1}>
        {staffByRole['Bếp'].name}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: 132, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  brand: { alignItems: 'center', marginBottom: 18 },
  destList: { gap: 12, flex: 1 },
  dest: { paddingVertical: 16, borderRadius: 4, alignItems: 'center', gap: 8 },
  label: { textAlign: 'center', fontSize: 15, lineHeight: 19 },
  staffName: { textAlign: 'center' },
});
