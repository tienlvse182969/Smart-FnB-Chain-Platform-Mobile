import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { categoryById, menu } from '@/src/data/mock';
import type { OrderItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { Txt } from './ui/txt';

export function OutOfStockDialog({
  visible,
  item,
  isMenuAvailable,
  onDismiss,
  onSwap,
  onDrop,
}: {
  visible: boolean;
  item: OrderItem | null;
  isMenuAvailable: (menuItemId: string) => boolean;
  onDismiss: () => void;
  onSwap: (newMenuItemId: string) => void;
  onDrop: () => void;
}) {
  const theme = useAppTheme();
  const [mode, setMode] = useState<'choose' | 'swap'>('choose');

  const close = () => {
    setMode('choose');
    onDismiss();
  };

  if (!item) return null;

  const options = menu.filter((m) => m.id !== item.menuItemId && isMenuAvailable(m.id));

  return (
    <AppModal
      visible={visible}
      title={`Hết món · ${item.name} ×${item.qty}`}
      onClose={close}
      actions={
        mode === 'choose'
          ? [{ text: 'Đóng', onPress: close }]
          : [{ text: 'Quay lại', onPress: () => setMode('choose') }]
      }>
      {mode === 'choose' ? (
        <>
          <Txt variant="caption" muted>
            Bếp báo hết. Chưa thu tiền nên không phát sinh hoàn tiền — ra bàn xin lỗi rồi chọn
            cách xử lý (mục 6.4).
          </Txt>
          <View style={styles.choiceRow}>
            <Btn label="Đổi món" icon="edit" onPress={() => setMode('swap')} />
            <Btn
              label="Bỏ món khỏi hoá đơn"
              icon="remove"
              variant="ghost"
              onPress={() => {
                onDrop();
                close();
              }}
            />
          </View>
        </>
      ) : null}

      {mode === 'swap' ? (
        <>
          <Txt variant="caption" muted>
            Chọn món thay cho khách.
          </Txt>
          <ScrollView style={styles.list}>
            {options.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  onSwap(m.id);
                  close();
                }}
                style={({ pressed }) => [
                  styles.opt,
                  { borderColor: theme.border_color_thin },
                  pressed && { backgroundColor: theme.fill_tap },
                ]}>
                <View style={styles.optText}>
                  <Txt variant="bodyStrong">{m.name}</Txt>
                  <Txt variant="caption" muted>
                    {formatVnd(m.price)} · {categoryById[m.categoryId]?.label}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  list: { maxHeight: 280 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optText: { flex: 1, gap: 2 },
});
