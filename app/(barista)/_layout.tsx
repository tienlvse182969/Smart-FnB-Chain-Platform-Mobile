import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NewOrderBanner } from '@/src/components/barista/new-order-banner';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function BaristaLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state, readyOrders } = useStore();

  // chưa đăng nhập hoặc sai vai trò → về màn hình đăng nhập
  if (state.role !== 'Pha chế') return <Redirect href="/login" />;

  const dests: NavDest[] = [
    {
      href: '/(barista)/queue',
      match: '/queue',
      label: t('nav.barista.queue'),
      icon: 'drink',
      badgeCount: readyOrders.length,
    },
    { href: '/(barista)/menu', match: '/menu', label: t('nav.barista.menu'), icon: 'receipt' },
  ];
  const staffName = state.currentUser?.name ?? staffByRole['Pha chế'].name;

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
          staffHref="/(barista)/account"
          size="lg"
        />
      ) : null}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.fill_body },
          }}
        />
        <NewOrderBanner />
      </View>
      {isPortrait ? (
        <NavRail
          compact={compact}
          edge="bottom"
          dests={dests}
          staffName={staffName}
          staffHref="/(barista)/account"
          size="lg"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
