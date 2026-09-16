import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { mockAiSuggest } from '@/src/data/ai-suggest';
import { formatVnd } from '@/src/data/format';
import { categories, categoryById, menu } from '@/src/data/mock';
import type { CartLine } from '@/src/data/store';
import type { MenuItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { ItemOptionsDialog, type ItemDraft } from './item-options-dialog';
import { MenuCategoryTabs } from './menu-category-tabs';
import { MenuItemCard } from './menu-item-card';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { Field } from './ui/field';
import { IconButton } from './ui/icon';
import { Txt } from './ui/txt';

type Line = CartLine & { key: string; name: string };

export function OrderEntryDialog({
  visible,
  tableNames,
  isMenuAvailable,
  remainingPortionsOf,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  tableNames: string[];
  isMenuAvailable: (menuItemId: string) => boolean;
  remainingPortionsOf: (menuItemId: string) => number | undefined;
  onDismiss: () => void;
  onSubmit: (cart: CartLine[]) => void;
}) {
  const theme = useAppTheme();
  const [category, setCategory] = useState(categories[0].id);
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<Line[]>([]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<{ items: MenuItem[]; note: string } | null>(null);

  const catMenu = useMemo(() => menu.filter((m) => m.categoryId === category), [category]);
  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const reset = () => {
    setCart([]);
    setCategory(categories[0].id);
    setAiQuery('');
    setAiResult(null);
  };

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

  const askAi = () => {
    setAiResult(mockAiSuggest(aiQuery, menu, isMenuAvailable));
  };

  return (
    <>
      <AppModal
        visible={visible}
        title={`Ghi order · ${tableNames.join(' + ')}`}
        onClose={onDismiss}
        maxWidth={640}
        actions={[
          { text: 'Huỷ', onPress: onDismiss },
          {
            text: `Gửi bếp · ${formatVnd(total)}`,
            primary: true,
            disabled: cart.length === 0,
            onPress: () => {
              onSubmit(cart.map(({ key: _key, name: _name, ...rest }) => rest));
              reset();
            },
          },
        ]}>
        <View style={[styles.aiBox, { borderColor: theme.border_color_thin }]}>
          <Txt variant="label" muted>
            Khách muốn gì? (AI gợi ý — mục 9)
          </Txt>
          <Field
            placeholder='vd: "4 người, 400k, 1 người không ăn cay"'
            value={aiQuery}
            onChangeText={setAiQuery}
          />
          <Btn label="Hỏi AI gợi ý" size="sm" variant="ghost" onPress={askAi} />
          {aiResult ? (
            <View style={styles.aiResult}>
              <Txt variant="caption" muted>
                {aiResult.note}
              </Txt>
              {aiResult.items.length === 0 ? (
                <Txt variant="caption" muted>
                  Không tìm được món phù hợp, thử mô tả khác.
                </Txt>
              ) : (
                aiResult.items.map((mi) => (
                  <View key={mi.id} style={styles.aiRow}>
                    <Txt variant="caption" numberOfLines={1} style={styles.aiName}>
                      {mi.name} · {formatVnd(mi.price)}
                    </Txt>
                    <Btn label="Thêm" size="sm" onPress={() => addLine(mi, 1, [], mi.price)} />
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>

        <MenuCategoryTabs categories={categories} value={category} onChange={setCategory} />
        <FlatList
          key={category}
          data={catMenu}
          numColumns={2}
          keyExtractor={(m) => m.id}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={styles.grid}
          style={styles.menuList}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <MenuItemCard
                item={item}
                categoryLabel={categoryById[item.categoryId]?.label ?? ''}
                available={isMenuAvailable(item.id)}
                remainingPortions={remainingPortionsOf(item.id)}
                onPress={() => setPicking(item)}
              />
            </View>
          )}
        />

        <View style={[styles.cart, { borderColor: theme.border_color_thin }]}>
          {cart.length === 0 ? (
            <Txt variant="caption" muted>
              Chưa chọn món nào.
            </Txt>
          ) : (
            cart.map((l) => (
              <View key={l.key} style={styles.cartLine}>
                <Txt variant="caption" numberOfLines={1} style={styles.cartName}>
                  {l.name}
                  {l.optionLabels.length ? ` · ${l.optionLabels.join(', ')}` : ''} ×{l.qty}
                </Txt>
                <Txt variant="caption">{formatVnd(l.unitPrice * l.qty)}</Txt>
                <IconButton
                  name="remove"
                  size={13}
                  onPress={() => setCart((prev) => prev.filter((x) => x.key !== l.key))}
                />
              </View>
            ))
          )}
        </View>
      </AppModal>

      <ItemOptionsDialog visible={!!picking} item={picking} onDismiss={() => setPicking(null)} onConfirm={addFromDraft} />
    </>
  );
}

const styles = StyleSheet.create({
  aiBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 10, gap: 8 },
  aiResult: { gap: 6, marginTop: 2 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiName: { flex: 1 },
  menuList: { maxHeight: 240 },
  grid: { gap: 8, paddingVertical: 4 },
  cell: { flex: 1 / 2 },
  cart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 10, gap: 6 },
  cartLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartName: { flex: 1 },
});
