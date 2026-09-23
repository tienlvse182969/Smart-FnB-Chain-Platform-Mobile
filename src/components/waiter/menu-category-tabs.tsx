import { ScrollView, StyleSheet } from 'react-native';

import type { MenuCategory } from '@/src/data/types';
import { Pill } from '../ui/pill';

export function MenuCategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: MenuCategory[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
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
