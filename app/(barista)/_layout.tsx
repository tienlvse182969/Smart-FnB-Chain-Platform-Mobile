import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function BaristaLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;
  const { state } = useStore();
  const { user, displayName, loading } = useAuth();

  // chưa đăng nhập hoặc sai vai trò → về màn hình đăng nhập
  if (loading) return null;
  if (user?.role !== 'BARISTA') return <Redirect href="/login" />;

  const dests: NavDest[] = [
    {
      href: '/(barista)/queue',
      match: '/queue',
      label: t('nav.barista.queue'),
      icon: 'queue',
    },
    { href: '/(barista)/menu', match: '/menu', label: t('nav.barista.menu'), icon: 'grid' },
  ];
  // tên tài khoản (họ tên nhân viên) dưới avatar; chỉ khi không biết tên mới hiện email
  const staffName = state.currentUser?.name || displayName || user.email;

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
