import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KitchenNewItemBanner } from '@/src/components/kitchen/kitchen-new-item-banner';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { staffByRole } from '@/src/data/mock';
import { useAppTheme } from '@/src/theme/use-theme';

export default function KitchenLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;

  const DESTS: NavDest[] = [
    { href: '/(kitchen)/queue', match: '/queue', label: t('nav.kitchen.queue'), icon: 'bell' },
    { href: '/(kitchen)/menu', match: '/menu', label: t('nav.kitchen.menu'), icon: 'receipt' },
    { href: '/(kitchen)/shift', match: '/shift', label: t('nav.kitchen.shift'), icon: 'shift' },
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
          dests={DESTS}
          staffName={staffByRole['Bếp'].name}
          staffHref="/(kitchen)/account"
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
        <KitchenNewItemBanner />
      </View>
      {isPortrait ? (
        <NavRail
          compact={compact}
          edge="bottom"
          dests={DESTS}
          staffName={staffByRole['Bếp'].name}
          staffHref="/(kitchen)/account"
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
