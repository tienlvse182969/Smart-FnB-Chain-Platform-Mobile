import { StyleSheet, View } from 'react-native';

import { durationSince } from '@/src/data/format';
import { ItemStatusBadge } from '../status-badge';
import type { KitchenTicket } from '@/src/data/store';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from '../ui/txt';

/** Góc nhìn hỗ trợ bếp căn giờ ra đồng loạt cho 1 bàn — không đổi lúc nào waiter được báo. */
export function KitchenTicketCard({ ticket }: { ticket: KitchenTicket }) {
  const theme = useAppTheme();
  const complete = ticket.doneCount >= ticket.totalCount;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.fill_base,
          borderColor: complete ? theme.color_text_base : theme.border_color_thin,
          borderWidth: complete ? 2 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.headRow}>
        <Txt style={styles.tables} numberOfLines={1}>
          {ticket.tableNames.join(', ')}
        </Txt>
        <Txt style={styles.progress}>
          {ticket.doneCount}/{ticket.totalCount} món xong
        </Txt>
      </View>
      <Txt variant="label" muted>
        gửi {durationSince(ticket.earliestQueuedAt)}
      </Txt>

      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

      {ticket.items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Txt style={styles.itemName} numberOfLines={1}>
              {item.name} ×{item.qty}
            </Txt>
            {item.optionLabels.length || item.note ? (
              <Txt style={styles.itemNote} numberOfLines={2}>
                {[item.optionLabels.join(', '), item.note ? `✎ ${item.note}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            ) : null}
          </View>
          <ItemStatusBadge status={item.status} size="sm" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 6, padding: 14, gap: 4 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tables: { fontFamily: fontFamily.bold, fontSize: 22, flexShrink: 1 },
  progress: { fontFamily: fontFamily.bold, fontSize: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 8 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontFamily: fontFamily.medium, fontSize: 18, flexShrink: 1 },
  itemNote: { fontFamily: fontFamily.medium, fontSize: 14 },
});
