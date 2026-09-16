import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { KitchenNav } from '@/src/components/kitchen/kitchen-nav';
import { useAppTheme } from '@/src/theme/use-theme';

export default function KitchenLayout() {
  const theme = useAppTheme();
  return (
    <View style={[styles.shell, { backgroundColor: theme.fill_body }]}>
      <KitchenNav />
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
