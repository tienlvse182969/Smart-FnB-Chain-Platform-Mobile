import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { OrderDetailDialog } from '@/src/components/pos/order-detail-dialog';
import { ScreenHeader } from '@/src/components/screen-header';
import { OrderStatusBadge } from '@/src/components/status-badge';
import { Btn } from '@/src/components/ui/button';
import { Segmented } from '@/src/components/ui/segmented';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, formatVnd } from '@/src/data/format';
import type { HistoryOrder } from '@/src/data/types';
import { paymentMethodKey } from '@/src/i18n/labels';
import { loadTodayOrders } from '@/src/services/cashier-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type Filter = 'all' | 'active' | 'cancelled';

/** Trạng thái đơn đổi khi pha chế xong nên tải lại định kỳ lúc màn hình đang mở. */
const POLL_INTERVAL_MS = 15_000;

/** Lịch sử đơn trong ngày của chi nhánh (CS-05) — xem lại và in lại bill; không huỷ được đơn đã trả (BR-18). */
export default function OrdersScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
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
        const next = await loadTodayOrders();
        if (current !== requestId.current) return;
        setOrders(next);
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
    [t],
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
                  </View>
                </View>
                <Txt variant="title">{formatVnd(o.total)}</Txt>
              </Pressable>
            )}
          />
        )}
      </View>

      <OrderDetailDialog order={openOrder} onClose={() => setOpenId(null)} />
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
});
