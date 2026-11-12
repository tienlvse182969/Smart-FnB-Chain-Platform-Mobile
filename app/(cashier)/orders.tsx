import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { OrderDetailDialog } from '@/src/components/pos/order-detail-dialog';
import { ScreenHeader } from '@/src/components/screen-header';
import { OrderStatusBadge, RefundBadge } from '@/src/components/status-badge';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, formatVnd } from '@/src/data/format';
import type { HistoryOrder } from '@/src/data/types';
import { paymentMethodKey } from '@/src/i18n/labels';
import { listCashRefundApprovals, loadTodayOrders, type RefundApprovalRequest } from '@/src/services/cashier-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type Filter = 'all' | 'active' | 'cancelled';

/** Trạng thái đơn đổi khi pha chế xong nên tải lại định kỳ lúc màn hình đang mở. */
const POLL_INTERVAL_MS = 15_000;

/** Lịch sử đơn trong ngày của chi nhánh (CS-05) — xem lại, in lại bill và hoàn tiền mặt cho đơn đã trả hôm nay. */
export default function OrdersScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<RefundApprovalRequest[]>([]);
  const [range, setRange] = useState<'today' | 'recent'>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'pull' | 'silent') => {
      const current = ++requestId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'pull') setRefreshing(true);
      try {
        const next = await loadTodayOrders(range === 'today' ? 1 : 30);
        const requests = await listCashRefundApprovals().catch(() => null);
        if (current !== requestId.current) return;
        setOrders(next);
        if (requests) setApprovalRequests(requests);
        setError(null);
      } catch (reason) {
        if (current !== requestId.current || mode === 'silent') return;
        setError(reason instanceof Error ? reason.message : t('orders.loadError'));
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t, range],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
      const timer = setInterval(() => void load('silent'), POLL_INTERVAL_MS);
      return () => {
        clearInterval(timer);
        requestId.current += 1;
      };
    }, [load]),
  );

  const data = useMemo(
    () =>
      orders.filter((o) =>
        filter === 'all' ? true : filter === 'cancelled' ? o.status === 'Đã huỷ' : o.status !== 'Đã huỷ',
      ),
    [orders, filter],
  );
  const openOrder = useMemo(() => orders.find((o) => o.id === openId) ?? null, [orders, openId]);
  // yêu cầu hoàn tiền ngày trước đã chi trả có `refundId` → dùng để mở PDF phiếu hoàn của đơn
  const openOrderRefunds = useMemo(
    () =>
      approvalRequests
        .filter((request) => request.orderId === openId && request.status === 'COMPLETED' && request.refundId)
        .map((request) => ({
          id: request.refundId as string,
          amount: Number(request.amount),
          at: request.completedAt ?? undefined,
        })),
    [approvalRequests, openId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader title={t('orders.title')} subtitle={t('orders.subtitle', { count: data.length })} />
        <Segmented<'today' | 'recent'>
          value={range}
          onChange={setRange}
          style={styles.filter}
          options={[
            { value: 'today', label: t('refund.todayRange') },
            { value: 'recent', label: t('refund.recentRange') },
          ]}
        />
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

        {error ? (
          <View style={[styles.notice, { borderColor: theme.brand_error, backgroundColor: theme.fill_base }]}>
            <Txt variant="caption" color={theme.brand_error}>
              {error}
            </Txt>
            <Btn label={t('common.retry')} size="sm" onPress={() => void load('initial')} />
          </View>
        ) : null}

        {loading && orders.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={theme.brand_primary} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('pull')}
                tintColor={theme.brand_primary}
                colors={[theme.brand_primary]}
              />
            }
            ListEmptyComponent={
              error ? null : <EmptyState icon="receipt" title={t('orders.emptyTitle')} hint={t('orders.emptyHint')} />
            }
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
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {t('orders.orderCode', { code: o.orderCode })}
                  </Txt>
                  <Txt variant="caption" muted numberOfLines={1}>
                    {clockAt(o.createdAt)}
                    {o.payment ? ` · ${t(paymentMethodKey[o.payment.method])}` : ''}
                    {` · ${t('pos.cartCount', { count: o.lines.reduce((s, l) => s + l.qty, 0) })}`}
                  </Txt>
                  <View style={styles.badges}>
                    <OrderStatusBadge status={o.status} size="sm" />
                    {o.refundedAmount ? <RefundBadge amount={o.refundedAmount} size="sm" /> : null}
                    {o.pagerNumber !== undefined ? (
                      <View style={[styles.pagerTag, { borderColor: theme.border_color_base }]}>
                        <Icon name="pager" size={11} />
                        <Txt variant="tiny">{t('pager.short', { number: o.pagerNumber })}</Txt>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Txt variant="title">{formatVnd(o.total)}</Txt>
              </Pressable>
            )}
          />
        )}
      </View>

      <OrderDetailDialog
        order={openOrder}
        approvalRequest={approvalRequests.find((request) => request.orderId === openOrder?.id && (request.status === 'PENDING' || request.status === 'APPROVED')) ?? approvalRequests.find((request) => request.orderId === openOrder?.id) ?? null}
        knownRefunds={openOrderRefunds}
        onClose={() => setOpenId(null)}
        onRefunded={() => void load('silent')}
        onPagerChanged={() => void load('silent')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  filter: { paddingBottom: 8 },
  notice: { padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, gap: 8, marginBottom: 8 },
  loader: { padding: 20 },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 24, flexGrow: 1 },
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
  pagerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
