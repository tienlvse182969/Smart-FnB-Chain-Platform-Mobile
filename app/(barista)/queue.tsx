import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BatchCard } from '@/src/components/barista/batch-card';
import { EmptyState } from '@/src/components/empty-state';
import { ScreenHeader } from '@/src/components/screen-header';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { durationSince } from '@/src/data/format';
import { useStore } from '@/src/data/store';
import { useNow } from '@/src/data/use-now';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type KindFilter = 'all' | 'drink' | 'food';

/**
 * Màn hình pha chế (BA-01, BA-02): hàng đợi đã gom mẻ theo mục 8, cột "Sẵn sàng nhận" để bấm
 * Đã giao khi khách đưa phiếu số. Không có bàn/phiếu theo bàn — trả trước, nhận theo số.
 */
export default function BaristaQueueScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const now = useNow(15_000);
  const { state, batches, readyOrders, outOfStockEntries, startBatch, finishLines, handOver } = useStore();
  const [kind, setKind] = useState<KindFilter>('all');

  const wide = width >= 900;
  const kindOf = (categoryId: string) => state.categories.find((c) => c.id === categoryId)?.kind;

  const shown = useMemo(
    () => batches.filter((b) => kind === 'all' || kindOf(b.categoryId) === kind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batches, kind, state.categories],
  );
  const cups = shown.reduce((s, b) => s + b.cupCount, 0);

  const readyPanel = (
    <View
      style={[
        styles.readyPanel,
        wide ? styles.readyPanelWide : styles.readyPanelStacked,
        { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
      ]}>
      <View style={styles.readyHead}>
        <Icon name="ready" size={22} />
        <Txt style={styles.readyTitle}>{t('baristaQueue.readyTitle')}</Txt>
      </View>
      {readyOrders.length === 0 ? (
        <Txt variant="body" muted>
          {t('baristaQueue.readyEmpty')}
        </Txt>
      ) : (
        readyOrders.map((o) => (
          <View key={o.id} style={styles.readyRow}>
            <View style={[styles.readyCall, { borderColor: theme.border_color_base }]}>
              <Txt style={styles.readyNumber}>{String(o.callNumber ?? 0).padStart(3, '0')}</Txt>
            </View>
            <View style={styles.readyInfo}>
              <Txt variant="caption" muted numberOfLines={1}>
                {o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}
              </Txt>
              <Txt variant="tiny" muted>
                {o.readyAt ? durationSince(o.readyAt) : ''}
              </Txt>
            </View>
            <Pressable
              onPress={() => handOver(o.id)}
              style={({ pressed }) => [
                styles.handOverBtn,
                { backgroundColor: theme.brand_primary },
                pressed && { opacity: 0.7 },
              ]}>
              <Txt style={[styles.handOverText, { color: theme.color_text_base_inverse }]}>
                {t('baristaQueue.handOver')}
              </Txt>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title={t('baristaQueue.title')}
          subtitle={t('baristaQueue.subtitle', { batches: shown.length, cups })}
        />

        <View style={styles.filterRow}>
          <Pill label={t('baristaQueue.filterAll')} selected={kind === 'all'} onPress={() => setKind('all')} />
          <Pill label={t('baristaQueue.filterDrink')} selected={kind === 'drink'} onPress={() => setKind('drink')} />
          <Pill label={t('baristaQueue.filterFood')} selected={kind === 'food'} onPress={() => setKind('food')} />
        </View>

        {outOfStockEntries.length > 0 ? (
          <View style={[styles.alert, { borderColor: '#C0392B', backgroundColor: '#FBDBD8' }]}>
            <Icon name="unavailable" size={20} color="#C0392B" />
            <View style={styles.alertText}>
              <Txt variant="bodyStrong" color="#C0392B">
                {t('baristaQueue.outOfStockTitle')}
              </Txt>
              <Txt variant="body">
                {outOfStockEntries
                  .map((e) =>
                    t('baristaQueue.outOfStockItem', {
                      call: String(e.callNumber).padStart(3, '0'),
                      name: e.line.name,
                    }),
                  )
                  .join('  ·  ')}
              </Txt>
            </View>
          </View>
        ) : null}

        <View style={[styles.body, wide && styles.bodyWide]}>
          <View style={styles.queueCol}>
            {shown.length === 0 ? (
              <EmptyState icon="bellOff" title={t('baristaQueue.emptyTitle')} hint={t('baristaQueue.emptyHint')} />
            ) : (
              <FlatList
                data={shown}
                keyExtractor={(b) => b.key}
                contentContainerStyle={styles.list}
                ListFooterComponent={wide ? null : readyPanel}
                renderItem={({ item }) => (
                  <BatchCard batch={item} now={now} onStart={startBatch} onFinish={finishLines} />
                )}
              />
            )}
            {shown.length === 0 && !wide ? <ScrollView>{readyPanel}</ScrollView> : null}
          </View>
          {wide ? readyPanel : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  alertText: { flex: 1, gap: 2 },
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row', gap: 16 },
  queueCol: { flex: 1 },
  list: { gap: 12, paddingVertical: 8, paddingBottom: 24 },
  readyPanel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, padding: 14, gap: 10 },
  readyPanelWide: { width: 320, alignSelf: 'flex-start' },
  readyPanelStacked: { marginTop: 8 },
  readyHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyTitle: { fontFamily: fontFamily.bold, fontSize: 20 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyCall: {
    minWidth: 72,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  readyNumber: { fontFamily: fontFamily.black, fontSize: 26, lineHeight: 32 },
  readyInfo: { flex: 1, gap: 1 },
  handOverBtn: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handOverText: { fontFamily: fontFamily.bold, fontSize: 16 },
});
