import { toast } from '@/src/components/ui/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BatchCard } from '@/src/components/barista/batch-card';
import { EmptyState } from '@/src/components/empty-state';
import { ScreenHeader } from '@/src/components/screen-header';
import { SplitPanelLayout } from '@/src/components/split-panel-layout';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, durationSince } from '@/src/data/format';
import { useStore } from '@/src/data/store';
import type { Batch } from '@/src/data/types';
import { useNow } from '@/src/data/use-now';
import { completeUnit, deliverOrder, loadBaristaQueue, loadReadyOrders, startBatch, type ReadyCounterOrder } from '@/src/services/barista-api';
import { loadBaristaMenu } from '@/src/services/cashier-api';
import { notifyPager, pagerErrorMessage } from '@/src/services/pager-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type KindFilter = 'all' | 'drink' | 'food';

const GRID_GAP = 12;
const GRID_PADDING = 12;
/** Độ rộng mong muốn tối thiểu của một thẻ mẻ (dùng để tính thêm cột trên màn rất rộng). */
const MIN_CARD_WIDTH = 320;

/**
 * Màn hình pha chế (BA-01, BA-02): hàng đợi đã gom mẻ theo mục 8, cột "Sẵn sàng nhận" để bấm
 * Đã giao khi khách đưa phiếu số. Không có bàn/phiếu theo bàn — trả trước, nhận theo số.
 * Màn rộng dùng chung bố cục với màn Bán hàng: lưới mẻ bên trái, cột Sẵn sàng nhận bên phải.
 */
export default function BaristaQueueScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const now = useNow(15_000);
  const { state, replaceMenu } = useStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyCounterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  /** Thao tác đang gửi (để hiện vòng quay đúng nút): `<batchKey>:start|all|<lineId>` hoặc `deliver:<orderId>`. */
  const [pending, setPending] = useState<string | null>(null);
  const working = pending !== null;
  const [kind, setKind] = useState<KindFilter>('all');
  const [queueWidth, setQueueWidth] = useState(0);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [queue, ready, menu] = await Promise.all([loadBaristaQueue(), loadReadyOrders(), loadBaristaMenu()]);
      setBatches(queue);
      setReadyOrders(ready);
      replaceMenu(menu.menu, menu.categories);
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : 'Không thể tải hàng đợi', 2, undefined, false);
    } finally {
      setLoading(false);
    }
  }, [replaceMenu]);

  useEffect(() => {
    void refresh(true);
    const timer = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Vòng quay giữ tới khi tải lại xong để thẻ không nháy về trạng thái cũ trước khi cập nhật.
  const mutate = async (key: string, action: () => Promise<unknown>) => {
    if (working) return;
    setPending(key);
    try {
      await action();
      await refresh();
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : 'Thao tác thất bại', 2, undefined, false);
      await refresh();
    } finally {
      setPending(null);
    }
  };

  /**
   * Một nút "Đã giao" thay cho "Đã gọi máy" + "Đã giao": nếu đơn có máy báo rung chưa được ghi nhận
   * gọi thì ghi nhận gọi trước (backend chỉ nhận khi đơn còn READY), rồi mới giao. Ghi nhận gọi máy
   * lỗi (vd. máy vừa bị đổi số) không chặn việc giao — khách đã nhận đồ rồi.
   */
  const handOver = (order: ReadyCounterOrder) =>
    mutate(`deliver:${order.id}`, async () => {
      if (order.pagerNumber != null && !order.pagerNotifiedAt) {
        try {
          await notifyPager(order.id, order.pagerNumber);
        } catch (reason) {
          toast.fail(pagerErrorMessage(reason, t, order.pagerNumber), 2, undefined, false);
        }
      }
      await deliverOrder(order.id);
    });

  const wide = width >= 900;
  const kindOf = (categoryId: string) => state.categories.find((c) => c.id === categoryId)?.kind;

  const shown = useMemo(
    () => batches.filter((b) => kind === 'all' || kindOf(b.categoryId) === kind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batches, kind, state.categories],
  );
  const cups = shown.reduce((s, b) => s + b.cupCount, 0);
  // ảnh món cho thẻ mẻ — menu đã được tải cùng hàng đợi
  const imageByMenuItem = useMemo(
    () => new Map(state.menu.filter((m) => m.image).map((m) => [m.id, m.image])),
    [state.menu],
  );

  // Số cột theo độ rộng thật của phần hàng đợi (như lưới món của POS); thứ tự FIFO đọc theo hàng ngang.
  const inner = Math.max(0, queueWidth - GRID_PADDING * 2);
  // Màn rộng (có cột Sẵn sàng nhận) luôn tối thiểu 2 cột để giữ dạng lưới; màn hẹp mới được về 1 cột.
  const fit = Math.floor((inner + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP));
  const columns = Math.min(3, Math.max(wide ? 2 : 1, fit));
  const cardWidth = (inner - GRID_GAP * (columns - 1)) / columns;

  const readyRow = (o: ReadyCounterOrder) => (
    <View key={o.id} style={[styles.readyRow, { borderBottomColor: theme.border_color_thin }]}>
      <View style={styles.readyTop}>
        <View style={[styles.readyCall, { borderColor: theme.border_color_base }]}>
          <Txt style={styles.readyNumber}>{String(o.callNumber ?? 0).padStart(3, '0')}</Txt>
        </View>
        <View style={styles.readyMeta}>
          <Txt variant="caption" muted numberOfLines={1}>
            {o.readyAt ? t('baristaQueue.waited', { duration: durationSince(o.readyAt) }) : ''}
          </Txt>
          {o.pagerNumber != null ? (
            <View style={styles.pagerRow}>
              <Icon name="pager" size={13} />
              <Txt variant="caption" style={styles.pagerLabel}>
                {t('pager.short', { number: o.pagerNumber })}
              </Txt>
              {o.pagerNotifiedAt ? (
                <Txt variant="tiny" muted>
                  {t('pager.notified', { time: clockAt(o.pagerNotifiedAt) })}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      <Txt variant="body" numberOfLines={3}>
        {o.items.map((item) => `${item.quantity}× ${item.itemName}`).join(', ')}
      </Txt>
      <Pressable
        disabled={working}
        onPress={() => void handOver(o)}
        style={({ pressed }) => [
          styles.handOverBtn,
          { backgroundColor: theme.brand_primary },
          working && pending !== `deliver:${o.id}` && styles.btnDisabled,
          pressed && { opacity: 0.7 },
        ]}>
        {pending === `deliver:${o.id}` ? (
          <ActivityIndicator size="small" color={theme.brand_on_primary} />
        ) : (
          <Icon name="served" size={18} color={theme.brand_on_primary} />
        )}
        <Txt style={[styles.handOverText, { color: theme.brand_on_primary }]}>{t('baristaQueue.handOver')}</Txt>
      </Pressable>
    </View>
  );

  const readyHeader = (
    <View style={styles.readyHead}>
      <Icon name="ready" size={22} />
      <View style={styles.readyHeadText}>
        <Txt variant="h2" style={styles.readyTitle}>
          {t('baristaQueue.readyTitle')}
        </Txt>
        <Txt variant="caption" muted>
          {t('baristaQueue.readyCount', { count: readyOrders.length })}
        </Txt>
      </View>
    </View>
  );

  // Màn rộng: cột phải cao hết màn hình, danh sách cuộn riêng (giống giỏ hàng của POS).
  const readyPanel = (
    <>
      {readyHeader}
      <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
      {readyOrders.length === 0 ? (
        <View style={styles.readyEmpty}>
          <EmptyState icon="ready" title={t('baristaQueue.readyEmpty')} />
        </View>
      ) : (
        <FlatList
          style={styles.readyList}
          data={readyOrders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.readyListContent}
          renderItem={({ item }) => readyRow(item)}
        />
      )}
    </>
  );

  // Màn hẹp / dọc: không đủ chỗ chia đôi → Sẵn sàng nhận là một khối dưới lưới.
  const readyCard = (
    <View
      style={[styles.readyCard, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
      {readyHeader}
      {readyOrders.length === 0 ? (
        <Txt variant="body" muted style={styles.readyCardEmpty}>
          {t('baristaQueue.readyEmpty')}
        </Txt>
      ) : (
        <View style={styles.readyListContent}>{readyOrders.map(readyRow)}</View>
      )}
    </View>
  );

  const queueSide = (
    <View style={styles.queueSide} onLayout={wide ? undefined : (e) => setQueueWidth(e.nativeEvent.layout.width)}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={t('baristaQueue.title')}
          subtitle={t('baristaQueue.subtitle', { batches: shown.length, cups })}
        />
        <View style={styles.filterRow}>
          <Pill label={t('baristaQueue.filterAll')} selected={kind === 'all'} onPress={() => setKind('all')} />
          <Pill label={t('baristaQueue.filterDrink')} selected={kind === 'drink'} onPress={() => setKind('drink')} />
          <Pill label={t('baristaQueue.filterFood')} selected={kind === 'food'} onPress={() => setKind('food')} />
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.brand_primary} style={styles.loader} /> : null}

      {queueWidth > 0 ? (
        <FlatList
          key={`cols-${columns}`}
          style={styles.list}
          data={shown}
          numColumns={columns}
          keyExtractor={(b) => b.key}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          ListEmptyComponent={
            <EmptyState icon="bellOff" title={t('baristaQueue.emptyTitle')} hint={t('baristaQueue.emptyHint')} />
          }
          ListFooterComponent={wide ? null : readyCard}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <BatchCard
                batch={item}
                image={imageByMenuItem.get(item.menuItemId)}
                now={now}
                busy={pending?.startsWith(`${item.key}:`) ? pending.slice(item.key.length + 1) : null}
                disabled={working}
                onStart={(unitIds) => void mutate(`${item.key}:start`, () => startBatch(unitIds))}
                onFinish={(unitIds, part) =>
                  void mutate(`${item.key}:${part}`, () => Promise.all(unitIds.map(completeUnit)))
                }
              />
            </View>
          )}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      {wide ? (
        <SplitPanelLayout onMainWidth={setQueueWidth} panel={readyPanel}>
          {queueSide}
        </SplitPanelLayout>
      ) : (
        queueSide
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  queueSide: { flex: 1 },
  headerWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loader: { paddingVertical: 8 },
  list: { flex: 1 },
  grid: { gap: GRID_GAP, padding: GRID_PADDING, paddingBottom: 24 },
  // stretch: các thẻ cùng hàng cao bằng thẻ cao nhất (thẻ tự giãn bằng flexGrow)
  gridRow: { gap: GRID_GAP, alignItems: 'stretch' },
  divider: { height: StyleSheet.hairlineWidth },
  readyHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  readyHeadText: { flex: 1, gap: 3 },
  readyTitle: { fontFamily: fontFamily.semibold },
  readyEmpty: { flex: 1, justifyContent: 'center' },
  readyList: { flex: 1 },
  readyListContent: { paddingHorizontal: 14, paddingBottom: 14 },
  readyCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, marginTop: 4 },
  readyCardEmpty: { paddingHorizontal: 14, paddingBottom: 14 },
  readyRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  readyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readyCall: {
    minWidth: 72,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  readyNumber: { fontFamily: fontFamily.black, fontSize: 22, lineHeight: 28 },
  readyMeta: { flex: 1, gap: 2 },
  pagerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  pagerLabel: { fontFamily: fontFamily.bold },
  handOverBtn: {
    minHeight: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  btnDisabled: { opacity: 0.45 },
  handOverText: { fontFamily: fontFamily.bold, fontSize: 15 },
});
