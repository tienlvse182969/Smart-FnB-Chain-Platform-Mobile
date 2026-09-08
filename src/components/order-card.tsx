import { StyleSheet, View } from 'react-native';

import { clockAt, formatVnd } from '@/src/data/format';
import { orderTotal } from '@/src/data/store';
import type { SessionOrder } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { OrderLineRow } from './order-line-row';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

const PAYMENT_ICON = {
  'Chờ thanh toán': 'preparing',
  'Đã thanh toán': 'check',
  'Hết hạn': 'unavailable',
  Huỷ: 'unavailable',
} as const;

export function OrderCard({ order, index }: { order: SessionOrder; index: number }) {
  const theme = useAppTheme();
  const paid = order.paymentStatus === 'Đã thanh toán';

  return (
    <View style={[styles.card, { borderColor: theme.border_color_thin }]}>
      <View style={styles.header}>
        <Txt variant="label" muted>
          Order #{index + 1} · {clockAt(order.createdAt)}
          {order.viaWaiter ? ' · thay khách' : ''}
        </Txt>
        <View
          style={[
            styles.badge,
            {
              borderColor: theme.border_color_base,
              backgroundColor: paid ? theme.brand_primary : 'transparent',
            },
          ]}>
          <Icon
            name={PAYMENT_ICON[order.paymentStatus]}
            size={11}
            color={paid ? theme.color_text_base_inverse : theme.color_text_base}
          />
          <Txt
            variant="tiny"
            color={paid ? theme.color_text_base_inverse : theme.color_text_base}>
            {order.paymentStatus}
            {order.method ? ` · ${order.method}` : ''}
          </Txt>
        </View>
      </View>

      {order.items.map((item) => (
        <OrderLineRow key={item.id} item={item} />
      ))}

      <View style={styles.totalRow}>
        <Txt variant="caption" muted>
          Tổng order
        </Txt>
        <Txt variant="bodyStrong">{formatVnd(orderTotal(order))}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 12, gap: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});
