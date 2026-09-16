import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { suggestSeating } from '@/src/data/seating';
import type { Table, TableArea } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { EmptyState } from './empty-state';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { Pill } from './ui/pill';
import { Stepper } from './ui/stepper';
import { Txt } from './ui/txt';

const AREAS: (TableArea | 'Tất cả')[] = ['Tất cả', 'Tầng 1', 'Sân vườn', 'VIP'];

export function SeatingDialog({
  visible,
  tables,
  defaultArea,
  onDismiss,
  onOpen,
}: {
  visible: boolean;
  tables: Table[];
  defaultArea?: TableArea;
  onDismiss: () => void;
  onOpen: (tableIds: string[], guests: number) => void;
}) {
  const theme = useAppTheme();
  const [guests, setGuests] = useState(2);
  const [area, setArea] = useState<TableArea | 'Tất cả'>(defaultArea ?? 'Tất cả');

  useEffect(() => {
    if (visible) {
      setGuests(2);
      setArea(defaultArea ?? 'Tất cả');
    }
  }, [visible, defaultArea]);

  const options = useMemo(
    () => suggestSeating(tables, guests, area === 'Tất cả' ? undefined : area),
    [tables, guests, area],
  );

  return (
    <AppModal
      visible={visible}
      title="Mở bàn mới"
      onClose={onDismiss}
      maxWidth={480}
      actions={[{ text: 'Đóng', onPress: onDismiss }]}>
      <View style={styles.guestRow}>
        <Txt variant="bodyStrong">Số khách</Txt>
        <Stepper value={guests} onChange={setGuests} />
      </View>

      <View style={styles.areaRow}>
        {AREAS.map((a) => (
          <Pill key={a} label={a} selected={area === a} onPress={() => setArea(a)} />
        ))}
      </View>

      <Txt variant="label" muted style={styles.suggestLabel}>
        Gợi ý xếp & ghép bàn — chọn 1 phương án
      </Txt>

      {options.length === 0 ? (
        <EmptyState
          icon="unavailable"
          title="Không đủ chỗ"
          hint="Thử đổi khu vực hoặc giảm số khách."
        />
      ) : (
        <View style={styles.options}>
          {options.map((opt) => (
            <Pressable
              key={opt.tableIds.join(',')}
              onPress={() => onOpen(opt.tableIds, guests)}
              style={({ pressed }) => [
                styles.option,
                { borderColor: theme.border_color_thin },
                pressed && { backgroundColor: theme.fill_tap },
              ]}>
              <View style={styles.optionText}>
                <Txt variant="bodyStrong">{opt.tableNames.join(' + ')}</Txt>
                <Txt variant="caption" muted>
                  {opt.area} · {opt.totalSeats} ghế · thừa {opt.leftover}
                  {opt.tableIds.length > 1 ? ` · ghép ${opt.tableIds.length} bàn` : ''}
                </Txt>
              </View>
              <Btn label="Chọn" size="sm" onPress={() => onOpen(opt.tableIds, guests)} />
            </Pressable>
          ))}
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestLabel: { marginTop: 4 },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
  },
  optionText: { flex: 1, gap: 2 },
});
