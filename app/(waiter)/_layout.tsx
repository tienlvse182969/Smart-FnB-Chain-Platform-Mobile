import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KitchenReadyBanner } from '@/src/components/waiter/kitchen-ready-banner';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { OrderPanelOverlay } from '@/src/components/waiter/order-panel-overlay';
import { TablePanelOverlay } from '@/src/components/waiter/table-panel-overlay';
import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function WaiterLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state, unclaimedCount } = useStore();

  const dests: NavDest[] = [
    { href: '/(waiter)/floor', match: '/floor', label: t('nav.waiter.floor'), icon: 'grid' },
    {
      href: '/(waiter)/ready',
      match: '/ready',
      label: t('nav.waiter.ready'),
      icon: 'bell',
      badgeCount: unclaimedCount,
    },
    {
      href: '/(waiter)/reservations',
      match: '/reservations',
      label: t('nav.waiter.reservations'),
      icon: 'reservations',
      badgeCount: state.reservations.length,
    },
    { href: '/(waiter)/shift', match: '/shift', label: t('nav.waiter.shift'), icon: 'shift' },
  ];

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: theme.fill_body, flexDirection: isPortrait ? 'column' : 'row' },
      ]}>
      <OrderPanelOverlay>
        <TablePanelOverlay railWidth={compact ? 68 : 116}>
          {!isPortrait ? (
            <NavRail
              compact={compact}
              edge="left"
              dests={dests}
              staffName={state.currentUser?.name ?? staffByRole['Phục vụ'].name}
              staffHref="/(waiter)/account"
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
              staffName={state.currentUser?.name ?? staffByRole['Phục vụ'].name}
              staffHref="/(waiter)/account"
            />
          ) : null}
        </TablePanelOverlay>
      </OrderPanelOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
