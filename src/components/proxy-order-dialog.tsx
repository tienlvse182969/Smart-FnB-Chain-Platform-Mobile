import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { categories, menu } from '@/src/data/mock';
import type { CartLine } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { IconButton } from './ui/icon';
import { ItemOptionsDialog, type ItemDraft } from './item-options-dialog';
import { MenuCategoryTabs } from './menu-category-tabs';
import { MenuItemCard } from './menu-item-card';
import { Segmented } from './ui/segmented';
import { Txt } from './ui/txt';

type Line = CartLine & { key: string; name: string };

export function ProxyOrderDialog({
  visible,
  tableName,
  unavailableMenu,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  tableName: string;
  unavailableMenu: string[];
  onDismiss: () => void;
  onSubmit: (cart: CartLine[], method: 'QR' | 'Tiền mặt') => void;
}) {
  const theme = useAppTheme();
  const [category, setCategory] = useState(categories[0].id);
  const [picking, setPicking] = useState<(typeof menu)[number] | null>(null);
  const [cart, setCart] = useState<Line[]>([]);
  const [method, setMethod] = useState<'QR' | 'Tiền mặt'>('QR');

  const catMenu = useMemo(() => menu.filter((m) => m.categoryId === category), [category]);
  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const reset = () => {
    setCart([]);
    setMethod('QR');
    setCategory(categories[0].id);
  };

  const addLine = (draft: ItemDraft) => {
    if (!picking) return;
    setCart((prev) => [
      ...prev,
      {
        key: `${picking.id}_${Date.now()}`,
        menuItemId: picking.id,
        name: picking.name,
        qty: draft.qty,
        note: draft.note || undefined,
        optionLabels: draft.optionLabels,
        unitPrice: draft.unitPrice,
      },
    ]);
    setPicking(null);
  };

  return (
    <>
      <AppModal
        visible={visible}
        title={`Order thay khách · ${tableName}`}
        onClose={onDismiss}
        maxWidth={640}
        actions={[
          { text: 'Huỷ', onPress: onDismiss },
          {
            text:
              method === 'QR'
                ? `Thanh toán QR (giả lập) · ${formatVnd(total)}`
                : `Tiền mặt — báo Thu ngân · ${formatVnd(total)}`,
            primary: true,
            disabled: cart.length === 0,
            onPress: () => {
              onSubmit(
                cart.map(({ key: _key, name: _name, ...rest }) => rest),
                method,
              );
              reset();
            },
          },
        ]}>
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
                disabled={unavailableMenu.includes(item.id)}
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

        <Segmented<'QR' | 'Tiền mặt'>
          value={method}
          onChange={setMethod}
          options={[
            { value: 'QR', label: 'Thanh toán QR' },
            { value: 'Tiền mặt', label: 'Tiền mặt' },
          ]}
        />
      </AppModal>

      <ItemOptionsDialog
        visible={!!picking}
        item={picking}
        onDismiss={() => setPicking(null)}
        onConfirm={addLine}
      />
    </>
  );
}

const styles = StyleSheet.create({
  menuList: { maxHeight: 240 },
  grid: { gap: 8, paddingVertical: 4 },
  cell: { flex: 1 / 2 },
  cart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 10, gap: 6 },
  cartLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartName: { flex: 1 },
});
