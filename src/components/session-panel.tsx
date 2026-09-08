import { ScrollView, StyleSheet, View } from 'react-native';

import { clockAt, durationSince, formatVnd } from '@/src/data/format';
import { sessionTotal } from '@/src/data/store';
import type { Table, TableSession } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { EmptyState } from './empty-state';
import { OrderCard } from './order-card';
import { Btn } from './ui/button';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function SessionPanel({
  table,
  session,
  outOfStockCount,
  onProxyOrder,
  onMove,
  onResolveStock,
  onClose,
}: {
  table: Table;
  session: TableSession;
  outOfStockCount: number;
  onProxyOrder: () => void;
  onMove: () => void;
  onResolveStock: () => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const paidOrders = session.orders.filter((o) => o.paymentStatus === 'Đã thanh toán');

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
      ]}>
      <View style={styles.header}>
        <Txt variant="h2">Phiên · {table.name}</Txt>
        <Txt variant="caption" muted>
          {session.guests} khách · mở {clockAt(session.openedAt)} · ngồi{' '}
          {durationSince(session.openedAt)}
        </Txt>
        <View style={styles.qrRow}>
          <Icon name="check" size={13} color={theme.color_text_caption} />
          <Txt variant="tiny" muted>
            Mã QR bàn {table.name} — đã kích hoạt
          </Txt>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

      {session.orders.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Chưa có order"
          hint="Khách quét QR trên bàn để tự gọi món, hoặc bấm “Order thay khách”."
        />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {session.orders.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </ScrollView>
      )}

      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Txt variant="body">
            {paidOrders.length} order đã thanh toán
          </Txt>
          <Txt variant="title">{formatVnd(sessionTotal(session))}</Txt>
        </View>
        <View style={styles.actions}>
          <Btn label="Order thay khách" icon="plus" size="sm" onPress={onProxyOrder} />
          <Btn label="Đổi bàn" icon="moveTable" size="sm" variant="ghost" onPress={onMove} />
          {outOfStockCount > 0 ? (
            <Btn
              label={`Xử lý hết món (${outOfStockCount})`}
              icon="unavailable"
              size="sm"
              onPress={onResolveStock}
            />
          ) : null}
          <Btn label="Đóng phiên" icon="logout" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <Txt variant="tiny" muted style={styles.hint}>
          Order xuống bếp tự động khi thanh toán thành công (BR-03) — phục vụ không duyệt tay.
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, overflow: 'hidden' },
  header: { padding: 14, gap: 3 },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  list: { flex: 1 },
  listContent: { padding: 14, gap: 12 },
  footer: { padding: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { textAlign: 'center' },
});
