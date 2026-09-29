import { ScrollView, StyleSheet } from 'react-native';

import type { MenuCategory } from '@/src/data/types';
import { Pill } from '../ui/pill';

/** id đặc biệt của pill "Tất cả" — không trùng id danh mục thật. */
export const ALL_CATEGORIES = 'all';

export function MenuCategoryTabs({
  categories,
  value,
  onChange,
  allLabel,
}: {
  categories: MenuCategory[];
  value: string;
  onChange: (id: string) => void;
  /** có nhãn thì thêm pill "Tất cả" (id `all`) ở đầu */
  allLabel?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {allLabel ? (
        <Pill label={allLabel} selected={value === ALL_CATEGORIES} onPress={() => onChange(ALL_CATEGORIES)} />
      ) : null}
      {categories.map((c) => (
        <Pill key={c.id} label={c.label} selected={c.id === value} onPress={() => onChange(c.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
});
