import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Table } from '@/src/data/types';
import { tableAreaKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function MoveTableDialog({
  visible,
  mode,
  fromTables,
  candidates,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  mode: 'move' | 'merge';
  fromTables: Table[];
  candidates: Table[];
  onDismiss: () => void;
  onPick: (tableId: string) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const fromLabel = fromTables.map((tb) => tb.name).join(' + ');
  const title =
    mode === 'move'
      ? t('moveTableDialog.moveTitle', { from: fromLabel })
      : t('moveTableDialog.mergeTitle', { from: fromLabel });
  const hint = mode === 'move' ? t('moveTableDialog.moveHint') : t('moveTableDialog.mergeHint');

  return (
    <AppModal visible={visible} title={title} onClose={onDismiss} actions={[{ text: t('common.cancel'), onPress: onDismiss }]}>
      <Txt variant="caption" muted>
        {hint}
      </Txt>
      {candidates.length === 0 ? (
        <Txt variant="body" muted style={styles.empty}>
          {t('moveTableDialog.noneAvailable')}
        </Txt>
      ) : (
        <ScrollView style={styles.list}>
          {candidates.map((tb) => (
            <Pressable
              key={tb.id}
              onPress={() => onPick(tb.id)}
              style={({ pressed }) => [
                styles.item,
                { borderColor: theme.border_color_thin },
                pressed && { backgroundColor: theme.fill_tap },
              ]}>
              <Icon name="chair" size={18} color={theme.color_text_caption} />
              <View style={styles.itemText}>
                <Txt variant="bodyStrong">
                  {t('moveTableDialog.seatsLabel', { name: tb.name, seats: tb.seats })}
                </Txt>
                <Txt variant="caption" muted>
                  {t(tableAreaKey[tb.area])}
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
