import { StyleSheet, View } from 'react-native';

import { clockAt, timeAgo } from '@/src/data/format';
import type { Reservation } from '@/src/data/types';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function ReservationRow({ reservation }: { reservation: Reservation }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
      ]}>
      <View style={styles.leftBlock}>
        <Txt variant="title" style={styles.time}>
          {clockAt(reservation.time)}
        </Txt>
        <Txt variant="tiny" muted>
          {timeAgo(reservation.time)}
        </Txt>
      </View>

      <View style={[styles.vline, { backgroundColor: theme.border_color_thin }]} />

      <View style={styles.info}>
        <Txt variant="bodyStrong">{reservation.guestName}</Txt>
        <Txt variant="caption" muted>
          {reservation.phone} · {reservation.partySize} khách
          {reservation.tableName ? ` · bàn ${reservation.tableName}` : ''}
        </Txt>
        {reservation.note ? (
          <View style={styles.noteRow}>
            <Icon name="edit" size={12} color={theme.color_text_caption} />
            <Txt variant="caption" muted style={styles.note}>
              {reservation.note}
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  leftBlock: { alignItems: 'center', minWidth: 56 },
  time: { fontFamily: fontFamily.semibold },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  info: { flex: 1, gap: 3 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  note: { fontStyle: 'italic', flexShrink: 1 },
});
