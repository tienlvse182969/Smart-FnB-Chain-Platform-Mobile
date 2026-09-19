import { Badge } from '@ant-design/react-native';
import type { Href } from 'expo-router';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './ui/icon';
import { Txt } from './ui/txt';

export type NavDest = {
  href: Href;
  match: string;
  label: string;
  icon: IconName;
  badgeCount?: number;
};

const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

/**
 * Nav rail dùng chung cho mọi actor (Waiter, Kitchen…) — logo, badge, avatar cuối rail
 * đồng nhất. `size="lg"` phóng to icon/chữ/khoảng chạm cho Kitchen (mục 4.7: đọc lướt,
 * tay bẩn, đứng xa) mà không tách component riêng.
 */
export function NavRail({
  compact,
  edge = 'left',
  dests,
  staffName,
  staffHref,
  size = 'md',
}: {
  compact: boolean;
  edge?: 'left' | 'bottom';
  dests: NavDest[];
  staffName: string;
  staffHref: Href;
  size?: 'md' | 'lg';
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const bottom = edge === 'bottom';
  const large = size === 'lg';
  const width = compact ? 68 : large ? 132 : 116;
  const iconSize = large ? 30 : 23;

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
        {dests.map((d) => {
          const active = pathname.includes(d.match);
          const showBadge = (d.badgeCount ?? 0) > 0;
          const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
          return (
            <Pressable
              key={d.match}
              onPress={() => router.replace(d.href)}
              style={({ pressed }) => [
                styles.dest,
                large && styles.destLg,
                bottom && styles.destBottom,
                active && { backgroundColor: theme.brand_primary },
                pressed && !active && { backgroundColor: theme.fill_tap },
              ]}>
              <View style={[styles.destInner, bottom && styles.destInnerBottom]}>
                <View style={styles.badgeSlot}>
                  {showBadge ? (
                    <Badge
                      text={d.badgeCount}
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
                          backgroundColor: '#C0392B',
                        },
                        text: { fontFamily: fontFamily.medium, fontSize: 10, lineHeight: 12 },
                      }}>
                      <Icon name={d.icon} size={iconSize} color={fg} />
                    </Badge>
                  ) : (
                    <Icon name={d.icon} size={iconSize} color={fg} />
                  )}
                </View>
                {!compact || bottom ? (
                  <Txt
                    variant={large ? 'bodyStrong' : 'tiny'}
                    color={fg}
                    style={[
                      styles.destLabel,
                      bottom && styles.destLabelBottom,
                      large && styles.destLabelLg,
                    ]}
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
            onPress={() => router.replace(staffHref)}
            style={[styles.avatar, { borderColor: theme.border_color_base }]}>
            <Txt variant="label">{initials(staffName)}</Txt>
          </Pressable>
          {!compact ? (
            <Txt variant="tiny" muted numberOfLines={1} style={styles.staffName}>
              {staffName}
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
  destLg: { paddingVertical: 16 },
  destBottom: { paddingVertical: 4, flex: 1 },
  destInner: { alignItems: 'center', gap: 4 },
  destInnerBottom: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  badgeSlot: { paddingVertical: 6, paddingHorizontal: 8 },
  destLabel: { textAlign: 'center' },
  destLabelBottom: { textAlign: 'left' },
  destLabelLg: { fontSize: 15, lineHeight: 19 },
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
