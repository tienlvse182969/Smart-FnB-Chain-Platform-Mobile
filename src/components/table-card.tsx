import { Pressable, StyleSheet, View } from 'react-native';

import { clockAt, durationSince } from '@/src/data/format';
import type { Table, TableSession } from '@/src/data/types';
import { TABLE_STATUS_COLORS } from '@/src/theme/status-colors';
import { useAppTheme } from '@/src/theme/use-theme';
import { TableStatusBadge } from './status-badge';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function TableCard({
  table,
  session,
  onPress,
}: {
  table: Table;
  session?: TableSession;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const color = TABLE_STATUS_COLORS[table.status];

  const items = session ? session.orders.flatMap((o) => o.items) : [];
  const waiting = items.filter((i) => i.status === 'Chờ bưng').length;
  const active = items.filter(
    (i) => !['Đã phục vụ', 'Huỷ', 'Hết món'].includes(i.status),
  ).length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: color.tint,
          borderColor: color.fill,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <View style={[styles.accent, { backgroundColor: color.fill }]} />

      <View style={styles.topRow}>
        <Txt variant="h2">{table.name}</Txt>
        <View style={styles.seats}>
          <Icon name="user" size={13} color={theme.color_text_caption} />
          <Txt variant="label" muted>
            {session ? `${session.guests}/${table.seats}` : table.seats}
          </Txt>
        </View>
      </View>

      <TableStatusBadge status={table.status} size="sm" />

      <View style={styles.bottomRow}>
        <Txt variant="tiny" muted numberOfLines={1} style={styles.area}>
          {table.status === 'Đã đặt trước' && table.reservedFor
            ? `${table.area} · đặt ${clockAt(table.reservedFor.time)}`
            : session
              ? `${table.area} · ${durationSince(session.openedAt)}`
              : table.area}
        </Txt>
        {session && active > 0 ? (
          <View
            style={[
              styles.pill,
              {
                borderColor: color.fill,
                backgroundColor: waiting ? color.fill : theme.fill_base,
              },
            ]}>
            <Icon
              name={waiting ? 'bell' : 'receipt'}
              size={11}
              color={waiting ? color.on : theme.color_text_base}
            />
            <Txt variant="tiny" color={waiting ? color.on : theme.color_text_base}>
              {waiting ? `${waiting} chờ bưng` : `${active} món`}
            </Txt>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 12,
    paddingLeft: 15,
    gap: 8,
    minHeight: 116,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  seats: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  area: { flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
});
