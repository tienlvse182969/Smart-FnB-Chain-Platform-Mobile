import { Badge } from '@ant-design/react-native';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './ui/icon';
import { Txt } from './ui/txt';

type Dest = {
  href: '/(waiter)/floor' | '/(waiter)/reservations' | '/(waiter)/ready' | '/(waiter)/shift';
  match: string;
  label: string;
  icon: IconName;
};

const DESTS: Dest[] = [
  { href: '/(waiter)/floor', match: '/floor', label: 'Sơ đồ bàn', icon: 'grid' },
  { href: '/(waiter)/ready', match: '/ready', label: 'Món chờ bưng', icon: 'bell' },
  { href: '/(waiter)/reservations', match: '/reservations', label: 'Đặt trước', icon: 'reservations' },
  { href: '/(waiter)/shift', match: '/shift', label: 'Ca làm', icon: 'shift' },
];

const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

export function NavRail({ compact }: { compact: boolean }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { unclaimedCount } = useStore();

  const width = compact ? 68 : 116;

  return (
    <View
      style={[
        styles.rail,
        {
          width,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: theme.fill_base,
          borderRightColor: theme.border_color_thin,
        },
      ]}>
      <View style={[styles.brand, compact && styles.brandCompact]}>
        {compact ? (
          <Image
            source={require('@/assets/logo/logo2-icon.png')}
            style={styles.brandIconCompact}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require('@/assets/logo/logo2.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

      <View style={styles.destList}>
        {DESTS.map((d) => {
          const active = pathname.includes(d.match);
          const showBadge = d.match === '/ready' && unclaimedCount > 0;
          const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
          return (
            <Pressable
              key={d.href}
              onPress={() => router.replace(d.href)}
              style={({ pressed }) => [
                styles.dest,
                active && { backgroundColor: theme.brand_primary },
                pressed && !active && { backgroundColor: theme.fill_tap },
              ]}>
              <View style={styles.destInner}>
                {showBadge ? (
                  <Badge text={unclaimedCount}>
                    <Icon name={d.icon} size={23} color={fg} />
                  </Badge>
                ) : (
                  <Icon name={d.icon} size={23} color={fg} />
                )}
                {!compact ? (
                  <Txt variant="tiny" color={fg} style={styles.destLabel} numberOfLines={2}>
                    {d.label}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.replace('/(waiter)/shift')}
          style={[styles.avatar, { borderColor: theme.border_color_base }]}>
          <Txt variant="label">{initials(staffByRole['Phục vụ'].name)}</Txt>
        </Pressable>
        {!compact ? (
          <Txt variant="tiny" muted numberOfLines={1} style={styles.staffName}>
            {staffByRole['Phục vụ'].name}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  brand: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, minHeight: 32 },
  brandCompact: { justifyContent: 'center' },
  brandLogo: { width: 84, height: 119 },
  brandIconCompact: { width: 32, height: 32 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  destList: { gap: 6, flex: 1 },
  dest: { paddingVertical: 10, paddingHorizontal: 4, borderRadius: 2 },
  destInner: { alignItems: 'center', gap: 4 },
  destLabel: { textAlign: 'center' },
  footer: { alignItems: 'center', gap: 8, marginTop: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: { maxWidth: 100, textAlign: 'center' },
});
