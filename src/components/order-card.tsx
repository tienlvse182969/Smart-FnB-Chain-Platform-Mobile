import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { clockAt, formatVnd } from '@/src/data/format';
import { orderTotal } from '@/src/data/store';
import type { OrderItem, SessionOrder } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { OrderLineRow } from './order-line-row';
import { Txt } from './ui/txt';

export function OrderCard({
  order,
  index,
  onEditItem,
  onRemoveItem,
  onQtyItem,
}: {
  order: SessionOrder;
  index: number;
  onEditItem?: (item: OrderItem) => void;
  onRemoveItem?: (item: OrderItem) => void;
  onQtyItem?: (item: OrderItem, qty: number) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { borderColor: theme.border_color_thin }]}>
      <Txt variant="label" muted style={styles.header}>
        {t('orderCard.header', { index: index + 1, time: clockAt(order.createdAt) })}
      </Txt>

      {order.items.map((item) => (
        <OrderLineRow
          key={item.id}
          item={item}
          editable={!!(onEditItem || onRemoveItem || onQtyItem)}
          onEdit={onEditItem ? () => onEditItem(item) : undefined}
          onRemove={onRemoveItem ? () => onRemoveItem(item) : undefined}
          onQty={onQtyItem ? (qty) => onQtyItem(item, qty) : undefined}
        />
      ))}

      <View style={styles.totalRow}>
        <Txt variant="caption" muted>
          {t('orderCard.total')}
        </Txt>
        <Txt variant="bodyStrong">{formatVnd(orderTotal(order))}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 12, gap: 2 },
  header: { marginBottom: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});
