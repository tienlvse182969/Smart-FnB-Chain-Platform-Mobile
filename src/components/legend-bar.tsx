import { ScrollView, StyleSheet } from 'react-native';

import type { TableStatus } from '@/src/data/types';
import { TableStatusBadge } from './status-badge';

const ORDER: TableStatus[] = ['Trống', 'Đã đặt trước', 'Đang phục vụ', 'Tạm khoá'];

export function LegendBar() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {ORDER.map((s) => (
        <TableStatusBadge key={s} status={s} size="sm" />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
});
