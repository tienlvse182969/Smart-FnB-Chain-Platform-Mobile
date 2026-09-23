import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { clockAt, durationSince, formatVnd } from '@/src/data/format';
import { sessionTotal } from '@/src/data/store';
import type { OrderItem, Table, TableSession } from '@/src/data/types';
import { checkoutMethodKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { fontFamily } from '@/src/theme/typography';
import { EmptyState } from '../empty-state';
import { OrderCard } from './order-card';
import { Btn } from '../ui/button';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

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
  const { t } = useTranslation();
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
          {t('sessionPanel.title', { names: tableNames.join(' + ') })}
        </Txt>
        <Txt variant="caption" muted>
          {t('sessionPanel.meta', {
            guests: session.guests,
            opened: clockAt(session.openedAt),
            duration: durationSince(session.openedAt),
          })}
        </Txt>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

      {awaitingConfirm ? (
        <View style={[styles.banner, { backgroundColor: theme.fill_grey }]}>
          <Icon name="preparing" size={16} color={theme.color_text_base} />
          <View style={styles.bannerText}>
            <Txt variant="bodyStrong">
              {payment!.method === 'Tiền mặt' && payment!.collectedBy
                ? t('sessionPanel.awaitingCashConfirm', { name: payment!.collectedBy })
                : t('sessionPanel.awaitingConfirm')}
            </Txt>
            <Txt variant="caption" muted>
              {t('sessionPanel.methodRequested', {
                method: t(checkoutMethodKey[payment!.method]),
                time: clockAt(payment!.requestedAt),
              })}
            </Txt>
          </View>
          {payment!.method === 'Chuyển khoản QR' ? (
            <Btn label={t('sessionPanel.viewQr')} size="sm" onPress={onViewQr} />
          ) : !payment!.collectedBy ? (
            <Btn label={t('sessionPanel.collectedCash')} size="sm" onPress={onCollectCash} />
          ) : null}
        </View>
      ) : null}

      {session.orders.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={t('sessionPanel.noOrdersTitle')}
          hint={t('sessionPanel.noOrdersHint')}
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
          <Txt variant="body">{t('sessionPanel.orderCount', { count: session.orders.length })}</Txt>
          <Txt variant="title" style={{ fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 }}>
            {formatVnd(sessionTotal(session))}
          </Txt>
        </View>
        <View style={styles.actions}>
          <Btn label={t('sessionPanel.newOrderBtn')} icon="plus" size="sm" onPress={onNewOrder} />
          <Btn label={t('sessionPanel.moveBtn')} icon="moveTable" size="sm" variant="ghost" onPress={onMove} />
          <Btn label={t('sessionPanel.mergeBtn')} icon="merge" size="sm" variant="ghost" onPress={onMerge} />
          {outOfStockCount > 0 ? (
            <Btn
              label={t('sessionPanel.resolveStockBtn', { count: outOfStockCount })}
              icon="unavailable"
              size="sm"
              onPress={onResolveStock}
            />
          ) : null}
          {!payment ? (
            <Btn label={t('sessionPanel.requestCheckoutBtn')} icon="receipt" size="sm" onPress={onRequestCheckout} />
          ) : null}
        </View>
        <Txt variant="tiny" muted style={styles.hint}>
          {t('sessionPanel.footerHint')}
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
