import { StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { EDITABLE_ITEM_STATUSES } from '@/src/data/store';
import type { OrderItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { ItemStatusBadge } from './status-badge';
import { Icon, IconButton } from './ui/icon';
import { Stepper } from './ui/stepper';
import { Txt } from './ui/txt';

export function OrderLineRow({
  item,
  editable,
  onEdit,
  onRemove,
  onQty,
}: {
  item: OrderItem;
  editable?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onQty?: (qty: number) => void;
}) {
  const theme = useAppTheme();
  const canEdit = editable && EDITABLE_ITEM_STATUSES.includes(item.status);
  const meta = [...item.optionLabels, item.note ? `“${item.note}”` : null, item.swapNote]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, { borderBottomColor: theme.border_color_thin }]}>
      <View style={styles.titleRow}>
        <Txt variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {item.name}
        </Txt>
        <Txt variant="bodyStrong" style={item.status === 'Huỷ' ? styles.strike : undefined}>
          {formatVnd(item.unitPrice * item.qty)}
        </Txt>
      </View>

      {meta ? (
        <Txt variant="caption" muted numberOfLines={2}>
          {meta}
        </Txt>
      ) : null}

      <View style={styles.controlRow}>
        <ItemStatusBadge status={item.status} size="sm" />
        <View style={styles.spacer} />

        {canEdit && onQty ? (
          <Stepper value={item.qty} onChange={onQty} size="sm" />
        ) : (
          <Txt variant="label" muted style={styles.qty}>
            ×{item.qty}
          </Txt>
        )}

        {canEdit && onEdit ? <IconButton name="edit" size={16} onPress={onEdit} /> : null}
        {canEdit && onRemove ? <IconButton name="remove" size={16} onPress={onRemove} /> : null}

        {item.claimedBy ? (
          <View style={styles.claim}>
            <Icon name="user" size={12} color={theme.color_text_caption} />
            <Txt variant="tiny" muted>
              {item.claimedBy} đang bưng
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flexShrink: 1 },
  strike: { textDecorationLine: 'line-through', opacity: 0.5 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spacer: { flex: 1 },
  qty: { marginHorizontal: 6 },
  claim: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 4 },
});
