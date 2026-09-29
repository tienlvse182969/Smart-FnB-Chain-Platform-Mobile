import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function CashierLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state } = useStore();

  // chưa đăng nhập hoặc sai vai trò → về màn hình đăng nhập
  if (state.role !== 'Thu ngân') return <Redirect href="/login" />;

  const dests: NavDest[] = [
    { href: '/(cashier)/pos', match: '/pos', label: t('nav.cashier.pos'), icon: 'pos' },
    { href: '/(cashier)/orders', match: '/orders', label: t('nav.cashier.orders'), icon: 'orders' },
  ];
  const staffName = state.currentUser?.name ?? staffByRole['Thu ngân'].name;

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
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
