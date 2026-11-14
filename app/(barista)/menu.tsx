import { toast } from '@/src/components/ui/toast';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { ALL_CATEGORIES, MenuCategoryTabs } from '@/src/components/pos/menu-category-tabs';
import { MenuItemCard, type MenuCardToggle } from '@/src/components/pos/menu-item-card';
import { ScreenHeader } from '@/src/components/screen-header';
import { Field } from '@/src/components/ui/field';
import { Icon, IconButton } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { normalizeText } from '@/src/data/order-utils';
import { useStore } from '@/src/data/store';
import type { MenuCategory, MenuItem } from '@/src/data/types';
import {
  setMenuExtraAvailability as updateExtra,
  setMenuItemAvailability as updateItem,
  setMenuOptionAvailability as updateOption,
} from '@/src/services/barista-api';
import { loadBaristaMenu } from '@/src/services/cashier-api';
import { useAppTheme } from '@/src/theme/use-theme';

const GRID_GAP = 10;
const GRID_PADDING = 12;
/** Tab ảo chứa topping/tuỳ chọn không bắt buộc (không thuộc danh mục món nào). */
const TOPPING_CATEGORY = '__topping';

/** Một thẻ trên lưới: món thật hoặc topping (tuỳ chọn) được dựng thành thẻ gọn không ảnh. */
type Card =
  | { kind: 'item'; item: MenuItem; label: string }
  | {
      /** option = lựa chọn không bắt buộc trong nhóm tuỳ chọn; extra = topping tính tiền theo phần */
      kind: 'option' | 'extra';
      item: MenuItem;
      label: string;
      branchAvailable: boolean;
      chainAvailable: boolean;
    };

type StatusFilter = 'all' | 'available' | 'unavailable';

/** Trạng thái công tắc của thẻ (cờ còn bán ở chi nhánh do pha chế/quản lý bật tắt). */
const isChecked = (card: Card) =>
  card.kind === 'item' ? (card.item.branchAvailable ?? card.item.available) : card.branchAvailable;

/**
 * Báo hết món hoặc hết một tuỳ chọn như topping (BA-03, mục 6.6). Bố cục giống lưới chọn món của
 * thu ngân, nút "+" được thay bằng công tắc còn bán. Tắt là quầy thu ngân không bán được ngay;
 * dòng đã trả tiền chứa món đó chuyển Hết món và báo Quản lý (BR-36).
 */
export default function BaristaMenuScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state, setMenuAvailability, setOptionAvailability, replaceMenu } = useStore();
  // chỉ khoá đúng thẻ đang lưu, các thẻ khác vẫn bật/tắt được
  const [working, setWorking] = useState<ReadonlySet<string>>(new Set());
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [width, setWidth] = useState(0);

  const reload = useCallback(async () => {
    try {
      const menu = await loadBaristaMenu();
      replaceMenu(menu.menu, menu.categories);
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : t('baristaMenu.loadFailed'), 2, undefined, false);
    }
  }, [replaceMenu, t]);

  // màn hình tự tải menu mỗi lần được focus, không dựa vào việc hàng đợi đã tải trước
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const markWorking = (id: string, on: boolean) =>
    setWorking((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const changeItem = async (id: string, available: boolean) => {
    markWorking(id, true);
    try {
      await updateItem(id, available);
      setMenuAvailability(id, available);
      await reload();
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : t('baristaMenu.updateItemFailed'), 2, undefined, false);
    } finally {
      markWorking(id, false);
    }
  };

  const changeOption = async (id: string, available: boolean) => {
    markWorking(id, true);
    try {
      await updateOption(id, available);
      setOptionAvailability(id, available);
      await reload();
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : t('baristaMenu.updateOptionFailed'), 2, undefined, false);
    } finally {
      markWorking(id, false);
    }
  };

  // extra không có cờ riêng trong store: lưu xong thì tải lại menu để lấy trạng thái mới
  const changeExtra = async (id: string, available: boolean) => {
    markWorking(id, true);
    try {
      await updateExtra(id, available);
      await reload();
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : t('baristaMenu.updateOptionFailed'), 2, undefined, false);
    } finally {
      markWorking(id, false);
    }
  };

  // Tab Topping: topping tính tiền theo phần (extras) trước, rồi tới tuỳ chọn không bắt buộc
  // (thêm shot, thêm kem…) — size/đường/đá là nhóm bắt buộc nên luôn sẵn.
  // Extra bị Owner tắt đã bị lọc khi tải menu nên không hiện ở đây.
  const optionCards = useMemo<Card[]>(() => {
    const seen = new Map<string, Card>();
    for (const item of state.menu) {
      for (const e of item.extras ?? []) {
        if (seen.has(e.id)) continue;
        seen.set(e.id, {
          kind: 'extra',
          label: t('baristaMenu.extraGroup'),
          branchAvailable: e.available,
          chainAvailable: true,
          item: {
            id: e.id,
            name: e.label,
            categoryId: TOPPING_CATEGORY,
            price: e.price,
            available: e.available,
            image: '',
            options: [],
            batchable: true,
          },
        });
      }
    }
    for (const item of state.menu) {
      for (const g of item.options) {
        if (g.required) continue;
        for (const c of g.choices) {
          if (seen.has(c.id)) continue;
          const branchAvailable = c.branchAvailable ?? c.available !== false;
          const chainAvailable = c.chainAvailable ?? true;
          seen.set(c.id, {
            kind: 'option',
            label: g.label,
            branchAvailable,
            chainAvailable,
            item: {
              id: c.id,
              name: c.label,
              categoryId: TOPPING_CATEGORY,
              price: c.priceDelta,
              available: branchAvailable && chainAvailable,
              image: '',
              options: [],
              batchable: true,
            },
          });
        }
      }
    }
    return [...seen.values()];
  }, [state.menu, t]);

  const tabs = useMemo<MenuCategory[]>(
    () =>
      optionCards.length
        ? [{ id: TOPPING_CATEGORY, label: t('baristaMenu.toppingTab'), kind: 'drink' }, ...state.categories]
        : state.categories,
    [optionCards.length, state.categories, t],
  );

  const itemCards = useMemo<Card[]>(
    () =>
      state.menu.map((item) => ({
        kind: 'item',
        item,
        label: state.categories.find((c) => c.id === item.categoryId)?.label ?? '',
      })),
    [state.menu, state.categories],
  );

  // "Tất cả" chỉ hiện món (thẻ có ảnh); khi đang tìm thì gộp cả topping để tìm được mọi thứ
  const searching = query.trim().length > 0;
  const matched = useMemo(() => {
    const q = normalizeText(query);
    const source =
      category === TOPPING_CATEGORY
        ? optionCards
        : category === ALL_CATEGORIES
          ? q
            ? [...itemCards, ...optionCards]
            : itemCards
          : itemCards.filter((c) => c.item.categoryId === category);
    if (!q) return source;
    return source.filter((c) => normalizeText(`${c.item.name} ${c.label}`).includes(q));
  }, [category, query, itemCards, optionCards]);

  // lọc theo đúng trạng thái công tắc đang hiển thị (Có sẵn / Không có sẵn), đếm trong danh mục + từ khoá hiện tại
  const availableCount = matched.filter(isChecked).length;
  const visible =
    status === 'all' ? matched : matched.filter((c) => isChecked(c) === (status === 'available'));

  const columns = width >= 1000 ? 5 : width >= 760 ? 4 : width >= 520 ? 3 : 2;
  const itemWidth = Math.max(0, (width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);

  const toggleFor = (card: Card): MenuCardToggle => {
    const busy = working.has(card.item.id);
    if (card.kind !== 'item') {
      const change = card.kind === 'extra' ? changeExtra : changeOption;
      return {
        checked: card.branchAvailable,
        disabled: busy || !card.chainAvailable,
        loading: busy,
        note: card.chainAvailable ? undefined : t('baristaMenu.chainDisabled'),
        noteColor: theme.brand_error,
        onChange: (v) => void change(card.item.id, v),
      };
    }
    const { item } = card;
    const chainOff = item.chainAvailable === false;
    const notAssigned = item.branchEnabled === false;
    const note = chainOff
      ? t('baristaMenu.chainDisabled')
      : notAssigned
        ? t('baristaMenu.notAssigned')
        : item.remainingPortions === 0
          ? t('baristaMenu.noPortions')
          : undefined;
    return {
      checked: isChecked(card),
      disabled: busy || chainOff || notAssigned,
      loading: busy,
      note,
      noteColor: chainOff || notAssigned ? theme.brand_error : theme.brand_warning,
      onChange: (v) => void changeItem(item.id, v),
    };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title={t('baristaMenu.title')} subtitle={t('baristaMenu.subtitle')} />
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={t('baristaMenu.searchPlaceholder')}
          autoCorrect={false}
          autoCapitalize="none"
          left={<Icon name="search" size={16} color={theme.color_text_caption} />}
          right={query ? <IconButton name="clear" size={16} onPress={() => setQuery('')} /> : undefined}
        />
      </View>
      <View style={styles.tabsWrap}>
        <MenuCategoryTabs
          categories={tabs}
          value={category}
          onChange={setCategory}
          allLabel={t('pos.allCategories')}
        />
        <Segmented<StatusFilter>
          style={styles.statusRow}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('baristaMenu.filterAll', { count: matched.length }) },
            { value: 'available', label: t('baristaMenu.filterAvailable', { count: availableCount }) },
            {
              value: 'unavailable',
              label: t('baristaMenu.filterUnavailable', { count: matched.length - availableCount }),
            },
          ]}
        />
      </View>
      <View style={styles.list} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <FlatList
            key={`${category}-${status}-${columns}`}
            data={visible}
            numColumns={columns}
            keyExtractor={(c) => `${c.kind}-${c.item.id}`}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              matched.length > 0 ? (
                <EmptyState icon="search" title={t('baristaMenu.noStatusMatch')} />
              ) : searching ? (
                <EmptyState icon="search" title={t('pos.noResultsTitle')} hint={t('pos.noResultsHint')} />
              ) : (
                <EmptyState icon="receipt" title={t('pos.emptyMenu')} />
              )
            }
            renderItem={({ item: card }) => (
              <View style={{ width: itemWidth }}>
                <MenuItemCard
                  item={card.item}
                  categoryLabel={card.label}
                  available={card.item.available}
                  hideImage={card.kind !== 'item'}
                  toggle={toggleFor(card)}
                />
              </View>
            )}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 16 },
  tabsWrap: { paddingHorizontal: GRID_PADDING, paddingTop: 8 },
  statusRow: { paddingVertical: 4, marginTop: 4 },
  list: { flex: 1 },
  grid: { gap: GRID_GAP, padding: GRID_PADDING },
  row: { gap: GRID_GAP, alignItems: 'flex-start' },
});
