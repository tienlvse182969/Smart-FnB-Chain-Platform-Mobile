import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { suggestSeating } from '@/src/data/seating';
import type { Table, TableArea } from '@/src/data/types';
import { tableAreaKey } from '@/src/i18n/labels';
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
  const { t } = useTranslation();
  const areaLabel = (a: TableArea | 'Tất cả') => (a === 'Tất cả' ? t('status.area.all') : t(tableAreaKey[a]));
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
      title={t('seatingDialog.title')}
      onClose={onDismiss}
      maxWidth={480}
      actions={[{ text: t('common.close'), onPress: onDismiss }]}>
      <View style={styles.guestRow}>
        <Txt variant="bodyStrong">{t('seatingDialog.guestCount')}</Txt>
        <Stepper value={guests} onChange={setGuests} />
      </View>

      <View style={styles.areaRow}>
        {AREAS.map((a) => (
          <Pill key={a} label={areaLabel(a)} selected={area === a} onPress={() => setArea(a)} />
        ))}
      </View>

      <Txt variant="label" muted style={styles.suggestLabel}>
        {t('seatingDialog.suggestLabel')}
      </Txt>

      {options.length === 0 ? (
        <EmptyState
          icon="unavailable"
          title={t('seatingDialog.emptyTitle')}
          hint={t('seatingDialog.emptyHint')}
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
                  {t('seatingDialog.optionMeta', {
                    area: t(tableAreaKey[opt.area]),
                    seats: opt.totalSeats,
                    leftover: opt.leftover,
                  })}
                  {opt.tableIds.length > 1
                    ? t('seatingDialog.optionMergeSuffix', { count: opt.tableIds.length })
                    : ''}
                </Txt>
              </View>
              <Btn label={t('common.choose')} size="sm" onPress={() => onOpen(opt.tableIds, guests)} />
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
