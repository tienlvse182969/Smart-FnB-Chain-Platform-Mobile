import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { menu } from '@/src/data/mock';
import type { OrderItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { Txt } from './ui/txt';

export function OutOfStockDialog({
  visible,
  item,
  unavailableMenu,
  onDismiss,
  onSwap,
  onRefund,
}: {
  visible: boolean;
  item: OrderItem | null;
  unavailableMenu: string[];
  onDismiss: () => void;
  onSwap: (newMenuItemId: string, unitPrice: number) => void;
  onRefund: (reason: string) => void;
}) {
  const theme = useAppTheme();
  const [mode, setMode] = useState<'choose' | 'swap' | 'refund'>('choose');

  const close = () => {
    setMode('choose');
    onDismiss();
  };

  if (!item) return null;

  const options = menu.filter(
    (m) => m.id !== item.menuItemId && m.available && !unavailableMenu.includes(m.id),
  );

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
            Bếp báo hết. Ra bàn trao đổi với khách rồi chọn cách xử lý (mục 7.4).
          </Txt>
          <View style={styles.choiceRow}>
            <Btn label="Đổi món" icon="edit" onPress={() => setMode('swap')} />
            <Btn
              label="Chuyển hoàn tiền"
              icon="receipt"
              variant="ghost"
              onPress={() => setMode('refund')}
            />
          </View>
        </>
      ) : null}

      {mode === 'swap' ? (
        <>
          <Txt variant="caption" muted>
            Chọn món thay. Chênh lệch giá tính theo {item.qty} phần.
          </Txt>
          <ScrollView style={styles.list}>
            {options.map((m) => {
              const diff = (m.price - item.unitPrice) * item.qty;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    onSwap(m.id, m.price);
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
                      {formatVnd(m.price)} · {m.station}
                    </Txt>
                  </View>
                  <Txt variant="label">
                    {diff === 0
                      ? 'ngang giá'
                      : diff > 0
                        ? `phụ thu ${formatVnd(diff)}`
                        : `hoàn ${formatVnd(-diff)}`}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {mode === 'refund' ? (
        <>
          <Txt variant="body">
            Tạo yêu cầu hoàn {formatVnd(item.unitPrice * item.qty)} cho {item.name}, chuyển
            Thu ngân xử lý và ghi audit log (BR-11).
          </Txt>
          <Btn
            label="Xác nhận chuyển hoàn tiền"
            icon="check"
            block
            onPress={() => {
              onRefund('Bếp báo hết món sau khi khách đã thanh toán');
              close();
            }}
          />
        </>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
