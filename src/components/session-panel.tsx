import { ScrollView, StyleSheet, View } from 'react-native';

import { clockAt, durationSince, formatVnd } from '@/src/data/format';
import { sessionTotal } from '@/src/data/store';
import type { OrderItem, Table, TableSession } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { fontFamily } from '@/src/theme/typography';
import { EmptyState } from './empty-state';
import { OrderCard } from './order-card';
import { Btn } from './ui/button';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function SessionPanel({
  tableNames,
  table,
  session,
  outOfStockCount,
  onNewOrder,
  onMove,
  onMerge,
  onResolveStock,
  onRequestCheckout,
  onCollectCash,
  onViewQr,
  onEditItem,
  onRemoveItem,
  onQtyItem,
}: {
  tableNames: string[];
  table: Table;
  session: TableSession;
  outOfStockCount: number;
  onNewOrder: () => void;
  onMove: () => void;
  onMerge: () => void;
  onResolveStock: () => void;
  onRequestCheckout: () => void;
  onCollectCash: () => void;
  onViewQr: () => void;
  onEditItem: (item: OrderItem) => void;
  onRemoveItem: (item: OrderItem) => void;
  onQtyItem: (item: OrderItem, qty: number) => void;
}) {
  const theme = useAppTheme();
  const payment = session.payment;
  const awaitingConfirm = !!payment && !payment.confirmedAt;

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
      ]}>
      <View style={styles.header}>
        <Txt variant="h2" style={styles.title}>
          Phiên · {tableNames.join(' + ')}
        </Txt>
        <Txt variant="caption" muted>
          {session.guests} khách · mở {clockAt(session.openedAt)} · ngồi{' '}
          {durationSince(session.openedAt)}
        </Txt>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

      {awaitingConfirm ? (
        <View style={[styles.banner, { backgroundColor: theme.fill_grey }]}>
          <Icon name="preparing" size={16} color={theme.color_text_base} />
          <View style={styles.bannerText}>
            <Txt variant="bodyStrong">
              {payment!.method === 'Tiền mặt' && payment!.collectedBy
                ? `Đã thu tiền mặt (bởi ${payment!.collectedBy}) — chờ Quản lý xác nhận`
                : 'Đang chờ Quản lý chi nhánh xác nhận thanh toán'}
            </Txt>
            <Txt variant="caption" muted>
              Phương thức: {payment!.method} · yêu cầu lúc {clockAt(payment!.requestedAt)}
            </Txt>
          </View>
          {payment!.method === 'Chuyển khoản QR' ? (
            <Btn label="Xem mã QR" size="sm" onPress={onViewQr} />
          ) : !payment!.collectedBy ? (
            <Btn label="Tôi đã thu tiền mặt" size="sm" onPress={onCollectCash} />
          ) : null}
        </View>
      ) : null}

      {session.orders.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Chưa có order"
          hint="Mang tablet ra bàn, bấm “Ghi order” để ghi món cho khách."
        />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {session.orders.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              onEditItem={onEditItem}
              onRemoveItem={onRemoveItem}
              onQtyItem={onQtyItem}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Txt variant="body">{session.orders.length} order</Txt>
          <Txt variant="title" style={{ fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 }}>
            {formatVnd(sessionTotal(session))}
          </Txt>
        </View>
        <View style={styles.actions}>
          <Btn label="Ghi order" icon="plus" size="sm" onPress={onNewOrder} />
          <Btn label="Đổi bàn" icon="moveTable" size="sm" variant="ghost" onPress={onMove} />
          <Btn label="Gộp bàn" icon="merge" size="sm" variant="ghost" onPress={onMerge} />
          {outOfStockCount > 0 ? (
            <Btn
              label={`Xử lý hết món (${outOfStockCount})`}
              icon="unavailable"
              size="sm"
              onPress={onResolveStock}
            />
          ) : null}
          {!payment ? (
            <Btn label="Yêu cầu tính tiền" icon="receipt" size="sm" onPress={onRequestCheckout} />
          ) : null}
        </View>
        <Txt variant="tiny" muted style={styles.hint}>
          Bấm “Ghi order” là xuống bếp ngay (BR-05) — không có bước duyệt. Chỉ Quản lý chi nhánh
          mới sinh mã QR và xác nhận thanh toán (BR-13).
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, overflow: 'hidden' },
  header: { padding: 14, gap: 3 },
  title: { fontFamily: fontFamily.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  bannerText: { flex: 1, gap: 2 },
  list: { flex: 1 },
  listContent: { padding: 14, gap: 12 },
  footer: { padding: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { textAlign: 'center' },
});
