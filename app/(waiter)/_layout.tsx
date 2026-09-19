import { Stack } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KitchenReadyBanner } from '@/src/components/kitchen-ready-banner';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function WaiterLayout() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state, unclaimedCount } = useStore();

  const dests: NavDest[] = [
    { href: '/(waiter)/floor', match: '/floor', label: 'Sơ đồ bàn', icon: 'grid' },
    {
      href: '/(waiter)/ready',
      match: '/ready',
      label: 'Món chờ bưng',
      icon: 'bell',
      badgeCount: unclaimedCount,
    },
    {
      href: '/(waiter)/reservations',
      match: '/reservations',
      label: 'Đặt trước',
      icon: 'reservations',
      badgeCount: state.reservations.length,
    },
    { href: '/(waiter)/shift', match: '/shift', label: 'Ca làm', icon: 'shift' },
  ];

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: theme.fill_body, flexDirection: isPortrait ? 'column' : 'row' },
      ]}>
      {!isPortrait ? (
        <NavRail
          compact={compact}
          edge="left"
          dests={dests}
          staffName={staffByRole['Phục vụ'].name}
          staffHref="/(waiter)/shift"
        />
      ) : null}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.fill_body },
          }}
        />
        <KitchenReadyBanner />
      </View>
      {isPortrait ? (
        <NavRail
          compact={compact}
          edge="bottom"
          dests={dests}
          staffName={staffByRole['Phục vụ'].name}
          staffHref="/(waiter)/shift"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
