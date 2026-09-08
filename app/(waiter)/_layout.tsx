import { Stack } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NavRail } from '@/src/components/nav-rail';
import { useAppTheme } from '@/src/theme/use-theme';

export default function WaiterLayout() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 820;

  return (
    <View style={[styles.shell, { backgroundColor: theme.fill_body }]}>
      <NavRail compact={compact} />
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.fill_body },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
});
