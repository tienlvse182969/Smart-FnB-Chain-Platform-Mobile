import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TableDetailPanel } from '@/src/components/waiter/table-detail-panel';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <TableDetailPanel
        id={id}
        onClose={() => router.replace('/(waiter)/floor')}
        onNavigate={(toId) =>
          router.replace({ pathname: '/(waiter)/table/[id]', params: { id: toId } })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
