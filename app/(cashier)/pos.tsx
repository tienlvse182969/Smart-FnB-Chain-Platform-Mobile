import { toast } from '@/src/components/ui/toast';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { CustomerDisplayBar } from '@/src/components/pos/customer-display-bar';
import { ServerCheckoutDialog } from '@/src/components/pos/server-checkout-dialog';
import { ItemOptionsDialog, type ItemDraft } from '@/src/components/pos/item-options-dialog';
import { ALL_CATEGORIES, MenuCategoryTabs } from '@/src/components/pos/menu-category-tabs';
import { MenuItemCard } from '@/src/components/pos/menu-item-card';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon, IconButton } from '@/src/components/ui/icon';
import { Stepper } from '@/src/components/ui/stepper';
import { Txt } from '@/src/components/ui/txt';
import { formatVnd } from '@/src/data/format';
import { normalizeText } from '@/src/data/order-utils';
import { useStore } from '@/src/data/store';
import type { MenuItem } from '@/src/data/types';
import { checkoutCart, loadCashierMenu, type CounterOrder } from '@/src/services/cashier-api';
import { useStation } from '@/src/stations/station-context';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

const GRID_GAP = 10;
const GRID_PADDING = 12;

/** POS tạo đơn tại quầy (CS-01): chọn món + tuỳ chọn, giỏ ở cột phải, chốt đơn rồi thu tiền. */
export default function PosScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const {
    state,
    isMenuAvailable,
    addCartLine,
    setCartQty,
    removeCartLine,
    decrementMenuItem,
    clearCart,
    replaceMenu,
  } = useStore();
  const { selectedStation } = useStation();
  const { menu, categories, cart } = state;

  const [width, setWidth] = useState(0);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CounterOrder | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setMenuLoading(true);
    setMenuError(null);
    replaceMenu([], []);
    loadCashierMenu()
      .then((result) => {
        if (active) replaceMenu(result.menu, result.categories);
      })
      .catch((reason) => {
        if (active) setMenuError(reason instanceof Error ? reason.message : 'Không thể tải thực đơn');
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => { active = false; };
  }, [reloadToken, replaceMenu, selectedStation?.id]);

  const cartWidth = Math.min(440, Math.max(320, width * 0.32));
  const menuWidth = Math.max(0, width - cartWidth);
  const columns = menuWidth >= 760 ? 4 : menuWidth >= 520 ? 3 : 2;
  const itemWidth = (menuWidth - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? '';
  // lọc theo danh mục ("Tất cả" = mọi món) VÀ từ khoá; tìm không phân biệt hoa/thường, không dấu
  const visibleMenu = useMemo(() => {
    const q = normalizeText(query);
    return menu.filter((m) => {
      if (category !== ALL_CATEGORIES && m.categoryId !== category) return false;
      if (!q) return true;
      const label = categories.find((c) => c.id === m.categoryId)?.label ?? '';
      return normalizeText(`${m.name} ${label}`).includes(q);
    });
  }, [menu, categories, category, query]);
  const searching = query.trim().length > 0;
  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const qtyByMenuItem = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of cart) acc[l.menuItemId] = (acc[l.menuItemId] ?? 0) + l.qty;
    return acc;
  }, [cart]);

  const addFromDraft = (draft: ItemDraft) => {
    if (!picking) return;
    addCartLine({
      menuItemId: picking.id,
      name: picking.name,
      qty: draft.qty,
      note: draft.note || undefined,
      options: draft.options,
      unitPrice: draft.unitPrice,
    });
    setPicking(null);
  };

  const checkout = async () => {
    if (!cart.length || checkingOut) return;
    setCheckingOut(true);
    try {
      setCheckoutOrder(await checkoutCart(cart));
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : 'Không thể chốt đơn', 3, undefined, false);
      setReloadToken((value) => value + 1);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.split} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.menuSide}>
          <View style={styles.searchWrap}>
            <Field
              value={query}
              onChangeText={setQuery}
              placeholder={t('pos.searchPlaceholder')}
              autoCorrect={false}
              autoCapitalize="none"
              left={<Icon name="search" size={16} color={theme.color_text_caption} />}
              right={query ? <IconButton name="clear" size={16} onPress={() => setQuery('')} /> : undefined}
            />
          </View>
          <View style={styles.tabsWrap}>
            <MenuCategoryTabs
              categories={categories}
              value={category}
              onChange={setCategory}
              allLabel={t('pos.allCategories')}
            />
          </View>
          {menuError ? (
            <View style={[styles.menuNotice, { borderColor: theme.brand_error, backgroundColor: theme.fill_base }]}>
              <Txt variant="caption" color={theme.brand_error}>{menuError}</Txt>
              <Btn label="Tải lại" size="sm" onPress={() => setReloadToken((value) => value + 1)} />
            </View>
          ) : null}
          {menuLoading ? <ActivityIndicator style={styles.loader} color={theme.brand_primary} /> : null}
          <FlatList
            key={`${category}-${columns}`}
            style={styles.list}
            data={visibleMenu}
            numColumns={columns}
            keyExtractor={(m) => m.id}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searching ? (
                <EmptyState icon="search" title={t('pos.noResultsTitle')} hint={t('pos.noResultsHint')} />
              ) : (
                <EmptyState icon="receipt" title={t('pos.emptyMenu')} />
              )
            }
            renderItem={({ item }) => (
              <View style={{ width: itemWidth }}>
                <MenuItemCard
                  item={item}
                  categoryLabel={categoryLabel(item.categoryId)}
                  available={isMenuAvailable(item.id)}
                  qtyInCart={qtyByMenuItem[item.id] ?? 0}
                  onPress={() => setPicking(item)}
                  onDecrement={() => decrementMenuItem(item.id)}
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
            <View style={styles.cartHeadText}>
              <Txt variant="h2" style={styles.cartTitle}>
                {t('pos.cartTitle')}
              </Txt>
              <Txt variant="caption" muted>
                {t('pos.cartCount', { count: cartCount })}
              </Txt>
            </View>
            {cart.length > 0 ? <IconButton name="remove" size={18} onPress={clearCart} /> : null}
          </View>
          <CustomerDisplayBar />
          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />

          {cart.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState icon="receipt" title={t('pos.emptyCartTitle')} hint={t('pos.emptyCart')} />
            </View>
          ) : (
            <FlatList
              style={styles.cartList}
              data={cart}
              keyExtractor={(l) => l.key}
              contentContainerStyle={styles.cartListContent}
              renderItem={({ item: l }) => {
                const size = l.options.find((o) => o.groupId === 'size');
                const detail = [
                  ...l.options.filter((o) => o.groupId !== 'size').map((o) => o.label),
                  l.note ? `“${l.note}”` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <View style={[styles.cartLine, { borderBottomColor: theme.border_color_thin }]}>
                    <View style={styles.cartLineTitleRow}>
                      <Txt variant="bodyStrong" numberOfLines={2} style={styles.cartLineName}>
                        {l.name}
                        {size ? ` (${size.label})` : ''}
                      </Txt>
                      <Txt variant="bodyStrong">{formatVnd(l.unitPrice * l.qty)}</Txt>
                    </View>
                    {detail ? (
                      <Txt variant="caption" muted numberOfLines={3}>
                        {detail}
                      </Txt>
                    ) : null}
                    <View style={styles.cartLineFoot}>
                      <Stepper value={l.qty} size="sm" onChange={(q) => setCartQty(l.key, q)} />
                      <IconButton name="remove" size={15} onPress={() => removeCartLine(l.key)} />
                    </View>
                  </View>
                );
              }}
            />
          )}

          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
          <View style={styles.cartFooter}>
            <View style={styles.summaryRow}>
              <Txt style={styles.summaryTotal}>{formatVnd(total)}</Txt>
            </View>
            <Btn
              label={t('pos.checkoutBtn', { total: formatVnd(total) })}
              icon="payment"
              block
              disabled={cart.length === 0}
              loading={checkingOut}
              onPress={() => void checkout()}
            />
          </View>
        </View>
      </View>

      <ItemOptionsDialog
        visible={!!picking}
        item={picking}
        onDismiss={() => setPicking(null)}
        onConfirm={addFromDraft}
      />
      <ServerCheckoutDialog
        order={checkoutOrder}
        onClose={(paid) => {
          setCheckoutOrder(null);
          if (paid) clearCart();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  split: { flex: 1, flexDirection: 'row' },
  menuSide: { flex: 1 },
  searchWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 12 },
  tabsWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 8 },
  menuNotice: { margin: GRID_PADDING, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, gap: 8 },
  loader: { padding: 20 },
  list: { flex: 1 },
  grid: { gap: GRID_GAP, padding: GRID_PADDING },
  row: { gap: GRID_GAP },
  cartPanel: { borderLeftWidth: StyleSheet.hairlineWidth },
  cartHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  cartHeadText: { flex: 1, gap: 3 },
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
  summaryTotal: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
});
