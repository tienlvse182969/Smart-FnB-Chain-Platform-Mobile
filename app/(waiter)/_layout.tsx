import { Stack } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KitchenReadyBanner } from '@/src/components/kitchen-ready-banner';
import { NavRail } from '@/src/components/nav-rail';
import { useAppTheme } from '@/src/theme/use-theme';

export default function WaiterLayout() {
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
      {!isPortrait ? <NavRail compact={compact} edge="left" /> : null}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.fill_body },
          }}
        />
        <KitchenReadyBanner />
      </View>
      {isPortrait ? <NavRail compact={compact} edge="bottom" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});
