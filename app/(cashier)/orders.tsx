import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { OrderDetailDialog } from '@/src/components/pos/order-detail-dialog';
import { ScreenHeader } from '@/src/components/screen-header';
import { OrderStatusBadge, PrintFailedBadge } from '@/src/components/status-badge';
import { Segmented } from '@/src/components/ui/segmented';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, formatVnd } from '@/src/data/format';
import { useStore } from '@/src/data/store';
import { paymentMethodKey } from '@/src/i18n/labels';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type Filter = 'all' | 'active' | 'cancelled';

/** Lịch sử đơn trong ngày của chi nhánh (CS-05) — xem lại và in lại bill; không huỷ được đơn đã trả (BR-18). */
export default function OrdersScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { ordersNewestFirst } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const data = useMemo(
    () =>
      ordersNewestFirst.filter((o) =>
        filter === 'all' ? true : filter === 'cancelled' ? o.status === 'Đã huỷ' : o.status !== 'Đã huỷ',
      ),
    [ordersNewestFirst, filter],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader title={t('orders.title')} subtitle={t('orders.subtitle', { count: data.length })} />
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          style={styles.filter}
          options={[
            { value: 'all', label: t('baristaQueue.filterAll') },
            { value: 'active', label: t('status.order.paid') },
            { value: 'cancelled', label: t('status.order.cancelled') },
          ]}
        />

        {data.length === 0 ? (
          <EmptyState icon="receipt" title={t('orders.emptyTitle')} hint={t('orders.emptyHint')} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.list}
            renderItem={({ item: o }) => (
              <Pressable
                onPress={() => setOpenId(o.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: theme.fill_base,
                    borderColor: theme.border_color_thin,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <View style={[styles.callBox, { borderColor: theme.border_color_base }]}>
                  <Txt style={styles.callNumber}>
                    {o.callNumber !== undefined ? String(o.callNumber).padStart(3, '0') : '—'}
                  </Txt>
                </View>
                <View style={styles.info}>
                  <Txt variant="bodyStrong">{t('orders.orderCode', { code: o.orderCode })}</Txt>
                  <Txt variant="caption" muted numberOfLines={1}>
                    {clockAt(o.createdAt)}
                    {o.payment ? ` · ${t(paymentMethodKey[o.payment.method])}` : ''}
                    {` · ${t('pos.cartCount', { count: o.lines.reduce((s, l) => s + l.qty, 0) })}`}
                  </Txt>
                  <View style={styles.badges}>
                    <OrderStatusBadge status={o.status} size="sm" />
                    {o.printStatus === 'In thất bại' ? <PrintFailedBadge size="sm" /> : null}
                  </View>
                </View>
                <Txt variant="title">{formatVnd(o.total)}</Txt>
              </Pressable>
            )}
          />
        )}
      </View>

      <OrderDetailDialog orderId={openId} onClose={() => setOpenId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  filter: { paddingBottom: 8 },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  callBox: {
    width: 64,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callNumber: { fontFamily: fontFamily.black, fontSize: 24, lineHeight: 30 },
  info: { flex: 1, gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
