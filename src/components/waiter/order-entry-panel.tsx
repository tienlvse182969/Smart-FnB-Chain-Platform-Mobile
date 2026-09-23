import { Toast } from '@ant-design/react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatVnd } from '@/src/data/format';
import { categories, categoryById, menu } from '@/src/data/mock';
import { useStore, type CartLine } from '@/src/data/store';
import type { MenuItem } from '@/src/data/types';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { EmptyState } from '../empty-state';
import { ItemOptionsDialog, type ItemDraft } from './item-options-dialog';
import { MenuCategoryTabs } from './menu-category-tabs';
import { MenuItemCard } from './menu-item-card';
import { Btn } from '../ui/button';
import { IconButton } from '../ui/icon';
import { Txt } from '../ui/txt';

const GRID_GAP = 10;
const GRID_PADDING = 12;

type Line = CartLine & { key: string; name: string };

export function OrderEntryPanel({ tableId, onClose }: { tableId: string; onClose: () => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { tableById, sessionByTable, isMenuAvailable, remainingPortionsOf, submitOrder } = useStore();

  const session = sessionByTable(tableId);
  const sessionTableIds = session?.tableIds ?? [tableId];
  const tableNames = sessionTableIds.map((tid) => tableById(tid)?.name ?? tid);

  const [category, setCategory] = useState(categories[0].id);
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<Line[]>([]);

  const cartWidth = Math.min(440, Math.max(340, width * 0.3));
  const menuWidth = width - cartWidth;
  const columns = menuWidth >= 760 ? 4 : menuWidth >= 560 ? 3 : 2;
  const itemWidth = (menuWidth - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;

  const catMenu = useMemo(() => menu.filter((m) => m.categoryId === category), [category]);
  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const qtyByMenuItem = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of cart) acc[l.menuItemId] = (acc[l.menuItemId] ?? 0) + l.qty;
    return acc;
  }, [cart]);

  const addLine = (mi: MenuItem, qty: number, optionLabels: string[], unitPrice: number, note?: string) => {
    setCart((prev) => [
      ...prev,
      { key: `${mi.id}_${Date.now()}_${Math.random()}`, menuItemId: mi.id, name: mi.name, qty, note, optionLabels, unitPrice },
    ]);
  };

  const addFromDraft = (draft: ItemDraft) => {
    if (!picking) return;
    addLine(picking, draft.qty, draft.optionLabels, draft.unitPrice, draft.note || undefined);
    setPicking(null);
  };

  /** Bớt 1 suất khỏi dòng mới thêm gần nhất của món này; hết suất thì bỏ hẳn dòng đó. */
  const decrementItem = (menuItemId: string) => {
    setCart((prev) => {
      const lastIdx = prev.map((l) => l.menuItemId).lastIndexOf(menuItemId);
      if (lastIdx === -1) return prev;
      const line = prev[lastIdx];
      if (line.qty > 1) {
        const next = [...prev];
        next[lastIdx] = { ...line, qty: line.qty - 1 };
        return next;
      }
      return prev.filter((_, i) => i !== lastIdx);
    });
  };

  const send = () => {
    if (!session) return;
    submitOrder(session.id, cart.map(({ key: _key, name: _name, ...rest }) => rest));
    Toast.success(t('tableDetail.orderSentToast'), 2);
    onClose();
  };

  if (!session) return null;

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]} edges={['top', 'right', 'bottom', 'left']}>
        <View style={[styles.header, { borderColor: theme.border_color_thin, backgroundColor: theme.fill_base }]}>
          <IconButton name="close" onPress={onClose} />
          <Txt variant="h2" numberOfLines={1} style={styles.headerTitle}>
            {t('orderEntryDialog.title', { tables: tableNames.join(' + ') })}
          </Txt>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.split}>
          <View style={styles.menuSide}>
            <View style={styles.tabsWrap}>
              <MenuCategoryTabs categories={categories} value={category} onChange={setCategory} />
            </View>
            <FlatList
              key={`${category}-${columns}`}
              style={styles.list}
              data={catMenu}
              numColumns={columns}
              keyExtractor={(m) => m.id}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <View style={{ width: itemWidth }}>
                  <MenuItemCard
                    item={item}
                    categoryLabel={categoryById[item.categoryId]?.label ?? ''}
                    available={isMenuAvailable(item.id)}
                    remainingPortions={remainingPortionsOf(item.id)}
                    qtyInCart={qtyByMenuItem[item.id] ?? 0}
                    onPress={() => setPicking(item)}
                    onDecrement={() => decrementItem(item.id)}
                  />
                </View>
              )}
            />
          </View>

          <View
            style={[
              styles.cartPanel,
              { width: cartWidth, backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
            ]}>
            <View style={styles.cartHeader}>
              <Txt variant="h2" style={styles.cartTitle}>
                {t('orderEntryDialog.cartTitle')}
              </Txt>
              <Txt variant="caption" muted>
                {t('orderEntryDialog.cartCount', { count: cart.length })}
              </Txt>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

            {cart.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="receipt"
                  title={t('orderEntryDialog.emptyCartTitle')}
                  hint={t('orderEntryDialog.emptyCart')}
                />
              </View>
            ) : (
              <FlatList
                style={styles.cartList}
                data={cart}
                keyExtractor={(l) => l.key}
                contentContainerStyle={styles.cartListContent}
                renderItem={({ item: l }) => (
                  <View style={[styles.cartLine, { borderBottomColor: theme.border_color_thin }]}>
                    <View style={styles.cartLineTitleRow}>
                      <Txt variant="bodyStrong" numberOfLines={2} style={styles.cartLineName}>
                        {l.name}
                      </Txt>
                      <Txt variant="bodyStrong">{formatVnd(l.unitPrice * l.qty)}</Txt>
                    </View>
                    {l.optionLabels.length || l.note ? (
                      <Txt variant="caption" muted numberOfLines={2}>
                        {[...l.optionLabels, l.note ? `“${l.note}”` : null].filter(Boolean).join(' · ')}
                      </Txt>
                    ) : null}
                    <View style={styles.cartLineFoot}>
                      <Txt variant="label" muted>
                        ×{l.qty}
                      </Txt>
                      <IconButton
                        name="remove"
                        size={15}
                        onPress={() => setCart((prev) => prev.filter((x) => x.key !== l.key))}
                      />
                    </View>
                  </View>
                )}
              />
            )}

            <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
            <View style={styles.cartFooter}>
              <View style={styles.summaryRow}>
                <Txt variant="body">{t('orderEntryDialog.cartCount', { count: cart.length })}</Txt>
                <Txt variant="title" style={styles.summaryTotal}>
                  {formatVnd(total)}
                </Txt>
              </View>
              <View style={styles.footerActions}>
                <Btn label={t('common.cancel')} variant="ghost" onPress={onClose} />
                <Btn
                  label={t('orderEntryDialog.sendBtn', { total: formatVnd(total) })}
                  disabled={cart.length === 0}
                  onPress={send}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ItemOptionsDialog visible={!!picking} item={picking} onDismiss={() => setPicking(null)} onConfirm={addFromDraft} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1 },
  headerSpacer: { width: 38 },
  split: { flex: 1, flexDirection: 'row' },
  menuSide: { flex: 1 },
  tabsWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 12 },
  list: { flex: 1 },
  grid: { gap: GRID_GAP, padding: GRID_PADDING },
  row: { gap: GRID_GAP },
  cartPanel: { borderLeftWidth: StyleSheet.hairlineWidth },
  cartHeader: { padding: 14, gap: 3 },
  cartTitle: { fontFamily: fontFamily.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  cartList: { flex: 1 },
  cartListContent: { padding: 14 },
  cartLine: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  cartLineTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cartLineName: { flexShrink: 1 },
  cartLineFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartFooter: { padding: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTotal: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
