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

export function NavRail({ compact, edge = 'left' }: { compact: boolean; edge?: 'left' | 'bottom' }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { state, unclaimedCount } = useStore();

  const bottom = edge === 'bottom';
  const width = compact ? 68 : 116;
  const reservedCount = state.tables.filter((t) => t.status === 'Đã đặt trước').length;

  return (
    <View
      style={[
        styles.rail,
        bottom
          ? {
              flexDirection: 'row',
              paddingLeft: insets.left + 10,
              paddingRight: insets.right + 10,
              paddingTop: 8,
              paddingBottom: insets.bottom + 8,
              backgroundColor: theme.fill_base,
              borderRightWidth: 0,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.border_color_thin,
            }
          : {
              width,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
              backgroundColor: theme.fill_base,
              borderRightColor: theme.border_color_thin,
            },
      ]}>
      {!bottom ? (
        <>
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
        </>
      ) : null}

      <View style={[styles.destList, bottom && styles.destListBottom]}>
        {DESTS.map((d) => {
          const active = pathname.includes(d.match);
          const badgeCount =
            d.match === '/ready' ? unclaimedCount : d.match === '/reservations' ? reservedCount : 0;
          const showBadge = badgeCount > 0;
          const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
          return (
            <Pressable
              key={d.href}
              onPress={() => router.replace(d.href)}
              style={({ pressed }) => [
                styles.dest,
                bottom && styles.destBottom,
                active && { backgroundColor: theme.brand_primary },
                pressed && !active && { backgroundColor: theme.fill_tap },
              ]}>
              <View style={[styles.destInner, bottom && styles.destInnerBottom]}>
                <View style={styles.badgeSlot}>
                  {showBadge ? (
                    <Badge
                      text={badgeCount}
                      styles={{
                        textDom: {
                          top: -6,
                          right: -8,
                          minWidth: 16,
                          height: 16,
                          paddingHorizontal: 3,
                          paddingVertical: 0,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          ...(d.match === '/ready' ? { backgroundColor: '#C0392B' } : null),
                        },
                        text: { fontSize: 10, lineHeight: 12 },
                      }}>
                      <Icon name={d.icon} size={23} color={fg} />
                    </Badge>
                  ) : (
                    <Icon name={d.icon} size={23} color={fg} />
                  )}
                </View>
                {!compact || bottom ? (
                  <Txt
                    variant="tiny"
                    color={fg}
                    style={[styles.destLabel, bottom && styles.destLabelBottom]}
                    numberOfLines={bottom ? 1 : 2}>
                    {d.label}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {!bottom ? (
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
      ) : null}
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
  destListBottom: { flexDirection: 'row', gap: 0, alignItems: 'center', justifyContent: 'space-evenly' },
  dest: { paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  destBottom: { paddingVertical: 4, flex: 1 },
  destInner: { alignItems: 'center', gap: 4 },
  destInnerBottom: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  badgeSlot: { paddingVertical: 6, paddingHorizontal: 8 },
  destLabel: { textAlign: 'center' },
  destLabelBottom: { textAlign: 'left' },
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
