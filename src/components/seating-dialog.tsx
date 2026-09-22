import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { suggestSeating } from '@/src/data/seating';
import type { Table, TableArea } from '@/src/data/types';
import { tableAreaKey } from '@/src/i18n/labels';
import { TABLE_STATUS_COLORS } from '@/src/theme/status-colors';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { EmptyState } from './empty-state';
import { TableStatusBadge } from './status-badge';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { Icon } from './ui/icon';
import { Pill } from './ui/pill';
import { Stepper } from './ui/stepper';
import { Txt } from './ui/txt';

/** Ô bàn nhỏ — cùng ngôn ngữ hình ảnh với TableCard ở sơ đồ bàn (viền/nền/badge theo màu trạng thái). */
function SuggestionTile({ table }: { table: Table }) {
  const theme = useAppTheme();
  const color = TABLE_STATUS_COLORS.Trống;
  return (
    <View style={[styles.tile, { backgroundColor: color.tint, borderColor: color.fill }]}>
      <View style={[styles.tileAccent, { backgroundColor: color.fill }]} />
      <Txt variant="bodyStrong" style={styles.tileName} numberOfLines={1}>
        {table.name}
      </Txt>
      <View style={styles.tileSeats}>
        <Icon name="user" size={12} color={theme.color_text_caption} />
        <Txt variant="label" muted>
          {table.seats}
        </Txt>
      </View>
      <TableStatusBadge status="Trống" size="sm" />
    </View>
  );
}

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
  const tableById = useMemo(() => new Map(tables.map((tb) => [tb.id, tb])), [tables]);

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
          {options.map((opt, index) => (
            <Pressable
              key={opt.tableIds.join(',')}
              onPress={() => onOpen(opt.tableIds, guests)}
              style={({ pressed }) => [
                styles.option,
                { borderColor: theme.border_color_thin },
                pressed && { backgroundColor: theme.fill_tap },
              ]}>
              {index === 0 && options.length > 1 ? (
                <Txt variant="tiny" muted style={styles.bestTag}>
                  {t('seatingDialog.bestOption')}
                </Txt>
              ) : null}

              <View style={styles.tileGrid}>
                {opt.tableIds.map((id) => {
                  const tb = tableById.get(id);
                  return tb ? <SuggestionTile key={id} table={tb} /> : null;
                })}
              </View>

              <View style={styles.optionFooter}>
                <Txt variant="caption" muted style={styles.optionText}>
                  {t('seatingDialog.optionMeta', {
                    area: t(tableAreaKey[opt.area]),
                    seats: opt.totalSeats,
                    leftover: opt.leftover,
                  })}
                  {opt.tableIds.length > 1
                    ? t('seatingDialog.optionMergeSuffix', { count: opt.tableIds.length })
                    : ''}
                </Txt>
                <Btn label={t('common.choose')} size="sm" onPress={() => onOpen(opt.tableIds, guests)} />
              </View>
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
  options: { gap: 10 },
  option: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  bestTag: { textTransform: 'uppercase', letterSpacing: 0.4 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 },
  tile: {
    width: '31%',
    minHeight: 78,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 8,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  tileAccent: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
  tileName: { fontFamily: fontFamily.semibold },
  tileSeats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  optionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  optionText: { flex: 1, gap: 2 },
});
