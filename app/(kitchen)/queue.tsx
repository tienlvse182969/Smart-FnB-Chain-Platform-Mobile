import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { KitchenItemCard } from '@/src/components/kitchen/kitchen-item-card';
import { KitchenTicketCard } from '@/src/components/kitchen/kitchen-ticket-card';
import { ScreenHeader } from '@/src/components/screen-header';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { categories } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { OrderItemStatus } from '@/src/data/types';
import { orderItemStatusKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

type StatusFilter = 'all' | OrderItemStatus;

const STATUS_FILTERS: { value: StatusFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'kitchenQueue.statusFilterAll' },
  { value: 'Trong hàng đợi', labelKey: orderItemStatusKey['Trong hàng đợi'] },
  { value: 'Đang làm', labelKey: orderItemStatusKey['Đang làm'] },
];

export default function KitchenQueueScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state, kitchenQueue, kitchenTickets, setItemStatus, setKitchenView, setKitchenStationCategories } =
    useStore();

  const selectedCats = state.kitchenStationCategories;
  const toggleCat = (id: string) =>
    setKitchenStationCategories(
      selectedCats.includes(id) ? selectedCats.filter((x) => x !== id) : [...selectedCats, id],
    );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredItems = useMemo(
    () =>
      kitchenQueue
        .filter((t) => selectedCats.length === 0 || selectedCats.includes(t.categoryId))
        .filter((t) => statusFilter === 'all' || t.status === statusFilter),
    [kitchenQueue, selectedCats, statusFilter],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title={t('kitchenQueue.title')}
          subtitle={t('kitchenQueue.subtitle', { count: filteredItems.length })}
          right={
            <View style={[styles.viewToggle, { borderColor: theme.border_color_base }]}>
              <Pressable
                onPress={() => setKitchenView('item')}
                style={[styles.viewBtn, state.kitchenView === 'item' && { backgroundColor: theme.brand_primary }]}>
                <Icon
                  name="itemView"
                  size={18}
                  color={state.kitchenView === 'item' ? theme.color_text_base_inverse : theme.color_text_base}
                />
                <Txt
                  variant="bodyStrong"
                  color={state.kitchenView === 'item' ? theme.color_text_base_inverse : theme.color_text_base}>
                  {t('kitchenQueue.itemView')}
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => setKitchenView('ticket')}
                style={[styles.viewBtn, state.kitchenView === 'ticket' && { backgroundColor: theme.brand_primary }]}>
                <Icon
                  name="ticketView"
                  size={18}
                  color={state.kitchenView === 'ticket' ? theme.color_text_base_inverse : theme.color_text_base}
                />
                <Txt
                  variant="bodyStrong"
                  color={state.kitchenView === 'ticket' ? theme.color_text_base_inverse : theme.color_text_base}>
                  {t('kitchenQueue.ticketView')}
                </Txt>
              </Pressable>
            </View>
          }
        />

        {state.kitchenView === 'item' ? (
          <>
            <View style={styles.filterRow}>
              <Pill
                label={t('kitchenQueue.filterAll')}
                selected={selectedCats.length === 0}
                onPress={() => setKitchenStationCategories([])}
              />
              {categories.map((c) => (
                <Pill key={c.id} label={c.label} selected={selectedCats.includes(c.id)} onPress={() => toggleCat(c.id)} />
              ))}
            </View>
            <View style={styles.statusRow}>
              {STATUS_FILTERS.map((s) => (
                <Pill
                  key={s.value}
                  label={t(s.labelKey)}
                  selected={statusFilter === s.value}
                  onPress={() => setStatusFilter(s.value)}
                />
              ))}
            </View>
          </>
        ) : null}

        {state.kitchenView === 'item' ? (
          filteredItems.length === 0 ? (
            <EmptyState icon="bellOff" title={t('kitchenQueue.emptyTitle')} hint={t('kitchenQueue.emptyHint')} />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(it) => it.itemId}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <KitchenItemCard
                  ticket={item}
                  onSetStatus={(status) => {
                    for (const id of item.mergedItemIds) setItemStatus(id, status);
                  }}
                />
              )}
            />
          )
        ) : kitchenTickets.length === 0 ? (
          <EmptyState icon="bellOff" title={t('kitchenQueue.emptyBillTitle')} />
        ) : (
          <FlatList
            data={kitchenTickets}
            keyExtractor={(tk) => tk.orderId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <KitchenTicketCard ticket={item} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  list: { gap: 12, paddingVertical: 8, paddingBottom: 24 },
});
