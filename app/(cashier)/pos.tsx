import { toast } from '@/src/components/ui/toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { CustomerDisplayBar } from '@/src/components/pos/customer-display-bar';
import { ServerCheckoutDialog } from '@/src/components/pos/server-checkout-dialog';
import { ComboOptionsDialog, type ComboDraft } from '@/src/components/pos/combo-options-dialog';
import { ItemOptionsDialog, type ItemDraft } from '@/src/components/pos/item-options-dialog';
import { ALL_CATEGORIES, MenuCategoryTabs } from '@/src/components/pos/menu-category-tabs';
import { MenuItemCard } from '@/src/components/pos/menu-item-card';
import { SplitPanelLayout } from '@/src/components/split-panel-layout';
import { StaffAvatarButton } from '@/src/components/staff-avatar';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon, IconButton } from '@/src/components/ui/icon';
import { Stepper } from '@/src/components/ui/stepper';
import { Txt } from '@/src/components/ui/txt';
import { formatVnd } from '@/src/data/format';
import { extraLabel, newItemsFirst, normalizeText } from '@/src/data/order-utils';
import { useStore, type CartLine } from '@/src/data/store';
import type { MenuCategory, MenuCombo, MenuItem } from '@/src/data/types';
import {
  checkoutCart,
  getCounterOrder,
  loadCashierMenu,
  type CounterOrder,
} from '@/src/services/cashier-api';
import {
  snapshotFromCart,
  updateCustomerDisplay,
} from '@/src/services/customer-display-realtime';
import { useStation } from '@/src/stations/station-context';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { useAuth } from '@/src/auth/auth-context';
import {
  clearPendingPayosCheckout,
  loadPendingPayosCheckout,
} from '@/src/services/pending-payment-storage';

const GRID_GAP = 10;
const GRID_PADDING = 12;
/** Tab ảo chứa các combo (combo không thuộc danh mục món trong context của thu ngân). */
const COMBO_CATEGORY = '__combo';

/** Combo hiển thị trên lưới bằng chính thẻ món. */
const comboCard = (combo: MenuCombo): MenuItem => ({
  id: combo.id,
  name: combo.name,
  categoryId: COMBO_CATEGORY,
  price: combo.price,
  available: combo.available,
  image: combo.image,
  options: [],
  batchable: true,
});

/** Hiện tối đa ngần này thành phần trên thẻ combo, còn lại gộp thành "+N món khác". */
const COMBO_CARD_MAX_LINES = 4;

/** Các món trong combo, hiện dưới tên trên thẻ: món cố định ghi tên, thành phần được chọn ghi các lựa chọn. */
function comboCardDetails(combo: MenuCombo, more: (count: number) => string): string[] {
  const lines = combo.components.map((c) => {
    const qty = c.quantity > 1 ? `${c.quantity}× ` : '';
    const names = c.type === 'FIXED' ? c.choices[0]?.name ?? c.name : c.choices.map((x) => x.name).join(' / ');
    return `• ${qty}${names || c.name}`;
  });
  if (lines.length <= COMBO_CARD_MAX_LINES) return lines;
  const shown = lines.slice(0, COMBO_CARD_MAX_LINES - 1);
  return [...shown, more(lines.length - shown.length)];
}

/**
 * Dòng mô tả dưới tên món trong giỏ, mỗi tuỳ chọn một dòng: tuỳ chọn (trừ size), topping,
 * món trong combo (tuỳ chọn của từng món thụt vào bên dưới), ghi chú.
 */
function cartLineDetail(l: CartLine): string[] {
  const note = l.note ? [`“${l.note}”`] : [];
  if (l.combo) {
    return [
      ...l.combo.components.flatMap((c) => {
        const size = c.options.find((o) => o.groupId === 'size');
        const rest = [
          ...c.options.filter((o) => o.groupId !== 'size').map((o) => o.label),
          ...c.extras.map(extraLabel),
        ];
        return [
          `• ${c.quantity > 1 ? `${c.quantity}× ` : ''}${c.itemName}${size ? ` (${size.label})` : ''}`,
          ...rest.map((label) => `    – ${label}`),
        ];
      }),
      ...note,
    ];
  }
  return [
    ...l.options.filter((o) => o.groupId !== 'size').map((o) => `• ${o.label}`),
    ...(l.extras ?? []).map((e) => `• ${extraLabel(e)}`),
    ...note,
  ];
}

/** POS tạo đơn tại quầy (CS-01): chọn món + tuỳ chọn, giỏ ở cột phải, chốt đơn rồi thu tiền. */
export default function PosScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
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

  const [menuWidth, setMenuWidth] = useState(0);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [combos, setCombos] = useState<MenuCombo[]>([]);
  const [pickingCombo, setPickingCombo] = useState<MenuCombo | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CounterOrder | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRefresh = useRef(false);

  const closeCheckout = useCallback((paid: boolean) => {
    setCheckoutOrder(null);
    if (paid) clearCart();
  }, [clearCart]);

  // Khôi phục đơn QR đang chờ sau khi app bị đóng/refresh. Dialog sẽ khôi phục paymentId
  // và recheck PayOS; không tạo đơn hoặc QR mới nên không thể thu trùng.
  useEffect(() => {
    if (!user || !selectedStation || checkoutOrder) return;
    let active = true;
    loadPendingPayosCheckout(user.id, selectedStation.branchId)
      .then(async (pending) => {
        if (!pending || pending.stationId !== selectedStation.id) return;
        const latest = await getCounterOrder(pending.order.id);
        if (!active) return;
        if (latest.status === 'CANCELLED') {
          await clearPendingPayosCheckout(user.id, selectedStation.branchId);
          return;
        }
        setCheckoutOrder(latest);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [checkoutOrder, selectedStation, user]);

  // giữ nguyên object khi giỏ không đổi — hộp thanh toán dùng nó làm phụ thuộc của effect,
  // object mới mỗi lần render sẽ gửi lại PAYMENT_PENDING và đè mất QR trên màn hình khách
  const cartSnapshot = useMemo(() => snapshotFromCart(cart), [cart]);

  useEffect(() => {
    if (!selectedStation) return;
    const timer = setTimeout(() => {
      void updateCustomerDisplay(selectedStation.id, cartSnapshot);
    }, 120);
    return () => clearTimeout(timer);
  }, [cartSnapshot, selectedStation]);

  useEffect(() => {
    let active = true;
    // kéo xuống để làm mới: giữ nguyên thực đơn đang hiện, chỉ dùng spinner của RefreshControl
    const pulled = pullRefresh.current;
    pullRefresh.current = false;
    setMenuError(null);
    if (!pulled) {
      setMenuLoading(true);
      replaceMenu([], []);
      setCombos([]);
    }
    loadCashierMenu()
      .then((result) => {
        if (!active) return;
        replaceMenu(result.menu, result.categories);
        setCombos(result.combos);
      })
      .catch((reason) => {
        if (active) setMenuError(reason instanceof Error ? reason.message : 'Không thể tải thực đơn');
      })
      .finally(() => {
        if (!active) return;
        setMenuLoading(false);
        setRefreshing(false);
      });
    return () => { active = false; };
  }, [reloadToken, replaceMenu, selectedStation?.id]);

  const refreshMenu = useCallback(() => {
    pullRefresh.current = true;
    setRefreshing(true);
    setReloadToken((value) => value + 1);
  }, []);

  const columns = menuWidth >= 760 ? 4 : menuWidth >= 520 ? 3 : 2;
  const itemWidth = (menuWidth - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;

  const comboById = useMemo(() => new Map(combos.map((c) => [c.id, c])), [combos]);
  const comboDetailsById = useMemo(
    () => new Map(combos.map((c) => [c.id, comboCardDetails(c, (count) => t('pos.comboMore', { count }))])),
    [combos, t],
  );
  const tabs = useMemo<MenuCategory[]>(
    () =>
      combos.length
        ? [{ id: COMBO_CATEGORY, label: t('pos.comboTab'), kind: 'drink' }, ...categories]
        : categories,
    [combos.length, categories, t],
  );
  // lọc theo danh mục ("Tất cả" = mọi món + combo) VÀ từ khoá; tìm không phân biệt hoa/thường, không dấu
  const visibleMenu = useMemo(() => {
    const q = normalizeText(query);
    const filtered = [...combos.map(comboCard), ...menu].filter((m) => {
      if (category !== ALL_CATEGORIES && m.categoryId !== category) return false;
      if (!q) return true;
      const label = tabs.find((c) => c.id === m.categoryId)?.label ?? '';
      return normalizeText(`${m.name} ${label}`).includes(q);
    });
    // món mới (badge "Mới") luôn lên đầu, kể cả trước combo
    return newItemsFirst(filtered, (m) => m);
  }, [menu, combos, tabs, category, query]);
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
      extras: draft.extras,
      unitPrice: draft.unitPrice,
    });
    setPicking(null);
  };

  const addComboFromDraft = (draft: ComboDraft) => {
    if (!pickingCombo) return;
    addCartLine({
      menuItemId: pickingCombo.id,
      name: pickingCombo.name,
      qty: draft.qty,
      note: draft.note || undefined,
      options: [],
      unitPrice: draft.unitPrice,
      combo: { comboId: pickingCombo.id, components: draft.components },
    });
    setPickingCombo(null);
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

  const cartPanel = (
    <>
      <View style={styles.cartHeader}>
        <View style={styles.cartHeadText}>
          <Txt variant="h2" style={styles.cartTitle}>
            {t('pos.cartTitle')}
          </Txt>
          <Txt variant="caption" muted>
            {t('pos.cartCount', { count: cartCount })}
          </Txt>
        </View>
        {cart.length > 0 ? <IconButton name="remove" size={18} onPress={() => setConfirmingClear(true)} /> : null}
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
            const detail = cartLineDetail(l).join('\n');
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
                  <Txt variant="caption" muted>
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
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <SplitPanelLayout onMainWidth={setMenuWidth} panel={cartPanel}>
        <View style={styles.menuSide}>
          <View style={styles.searchWrap}>
            {/* màn hình dọc: POS không có tiêu đề nên avatar nằm bên trái ô tìm món */}
            <StaffAvatarButton />
            <View style={styles.searchField}>
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
          </View>
          <View style={styles.tabsWrap}>
            <MenuCategoryTabs
              categories={tabs}
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
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshMenu}
                tintColor={theme.brand_primary}
                colors={[theme.brand_primary]}
              />
            }
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
                  available={comboById.get(item.id)?.available ?? isMenuAvailable(item.id)}
                  details={comboDetailsById.get(item.id)}
                  qtyInCart={qtyByMenuItem[item.id] ?? 0}
                  onPress={() => {
                    const combo = comboById.get(item.id);
                    if (combo) setPickingCombo(combo);
                    else setPicking(item);
                  }}
                  onDecrement={() => decrementMenuItem(item.id)}
                />
              </View>
            )}
          />
        </View>
      </SplitPanelLayout>

      <ItemOptionsDialog
        visible={!!picking}
        item={picking}
        onDismiss={() => setPicking(null)}
        onConfirm={addFromDraft}
      />
      <ComboOptionsDialog
        visible={!!pickingCombo}
        combo={pickingCombo}
        onDismiss={() => setPickingCombo(null)}
        onConfirm={addComboFromDraft}
      />
      <AppModal
        visible={confirmingClear}
        icon="remove"
        title={t('pos.clearCartTitle')}
        onClose={() => setConfirmingClear(false)}
        maxWidth={400}
        actions={[
          { text: t('common.cancel'), onPress: () => setConfirmingClear(false) },
          {
            text: t('pos.clearCartConfirm'),
            primary: true,
            onPress: () => {
              setConfirmingClear(false);
              clearCart();
            },
          },
        ]}>
        <Txt variant="body" style={styles.confirmText}>
          {t('pos.clearCartMessage', { count: cartCount })}
        </Txt>
      </AppModal>
      <ServerCheckoutDialog
        order={checkoutOrder}
        cartSnapshot={cartSnapshot}
        onClose={closeCheckout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  menuSide: { flex: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GRID_PADDING, paddingTop: 12 },
  searchField: { flex: 1 },
  tabsWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 8 },
  menuNotice: { margin: GRID_PADDING, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, gap: 8 },
  loader: { padding: 20 },
  list: { flex: 1 },
  grid: { gap: GRID_GAP, padding: GRID_PADDING },
  row: { gap: GRID_GAP },
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
  confirmText: { textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTotal: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
});
