import { Stack } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KitchenNewItemBanner } from '@/src/components/kitchen/kitchen-new-item-banner';
import { NavRail, type NavDest } from '@/src/components/nav-rail';
import { staffByRole } from '@/src/data/mock';
import { useAppTheme } from '@/src/theme/use-theme';

const DESTS: NavDest[] = [
  { href: '/(kitchen)/queue', match: '/queue', label: 'Hàng đợi', icon: 'bell' },
  { href: '/(kitchen)/menu', match: '/menu', label: 'Món ăn', icon: 'receipt' },
  { href: '/(kitchen)/shift', match: '/shift', label: 'Ca làm', icon: 'shift' },
];

export default function KitchenLayout() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const compact = isPortrait ? false : width < 820;

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
          staffHref="/(kitchen)/shift"
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
          staffHref="/(kitchen)/shift"
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
