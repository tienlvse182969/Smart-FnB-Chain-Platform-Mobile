import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { CustomerDisplayDialog } from '@/src/components/pos/customer-display-dialog';
import { useAuth } from '@/src/auth/auth-context';
import { useStore } from '@/src/data/store';
import { CustomerDisplayProvider } from '@/src/stations/customer-display-context';
import { useStation } from '@/src/stations/station-context';
import { useAppTheme } from '@/src/theme/use-theme';

export default function CashierLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state } = useStore();
  const { user, loading } = useAuth();
  const { selectedStation, loading: stationLoading } = useStation();

  // chưa đăng nhập hoặc sai vai trò → về màn hình đăng nhập
  if (loading) return null;
  if (user?.role !== 'CASHIER') return <Redirect href="/login" />;
  if (stationLoading) return null;
  if (!selectedStation) return <Redirect href="/select-station" />;

  const dests: NavDest[] = [
    { href: '/(cashier)/pos', match: '/pos', label: t('nav.cashier.pos'), icon: 'pos' },
    { href: '/(cashier)/orders', match: '/orders', label: t('nav.cashier.orders'), icon: 'orders' },
  ];
  const staffName = state.currentUser?.name ?? user.email;

  return (
    <CustomerDisplayProvider station={selectedStation}>
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
            staffName={staffName}
            staffHref="/(cashier)/account"
          />
        ) : null}
        <View style={styles.content}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.fill_body },
            }}
          />
        </View>
        {isPortrait ? (
          <NavRail
            compact={compact}
            edge="bottom"
            dests={dests}
            staffName={staffName}
            staffHref="/(cashier)/account"
          />
        ) : null}
      </View>
      <CustomerDisplayDialog />
    </CustomerDisplayProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
