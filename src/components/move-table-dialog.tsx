import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Table } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function MoveTableDialog({
  visible,
  fromTable,
  candidates,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  fromTable?: Table;
  candidates: Table[];
  onDismiss: () => void;
  onPick: (tableId: string) => void;
}) {
  const theme = useAppTheme();
  return (
    <AppModal
      visible={visible}
      title={`Đổi bàn${fromTable ? ` từ ${fromTable.name}` : ''}`}
      onClose={onDismiss}
      actions={[{ text: 'Huỷ', onPress: onDismiss }]}>
      <Txt variant="caption" muted>
        Chuyển toàn bộ phiên bàn sang bàn mới, giữ nguyên các order và trạng thái món (mục 7.5).
      </Txt>
      {candidates.length === 0 ? (
        <Txt variant="body" muted style={styles.empty}>
          Không có bàn trống phù hợp.
        </Txt>
      ) : (
        <ScrollView style={styles.list}>
          {candidates.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onPick(t.id)}
              style={({ pressed }) => [
                styles.item,
                { borderColor: theme.border_color_thin },
                pressed && { backgroundColor: theme.fill_tap },
              ]}>
              <Icon name="chair" size={18} color={theme.color_text_caption} />
              <View style={styles.itemText}>
                <Txt variant="bodyStrong">
                  {t.name} · {t.seats} chỗ
                </Txt>
                <Txt variant="caption" muted>
                  {t.area}
                </Txt>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 12 },
  list: { maxHeight: 300 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { gap: 2 },
});
