import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import type { MenuItem } from '@/src/data/types';
import { orderItemStatusKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from './ui/icon';
import { Txt } from './ui/txt';

export function MenuItemCard({
  item,
  categoryLabel,
  available,
  remainingPortions,
  onPress,
}: {
  item: MenuItem;
  categoryLabel: string;
  available: boolean;
  remainingPortions?: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const off = !available || remainingPortions === 0;
  const low = !off && remainingPortions !== undefined && remainingPortions <= 5;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.fill_base,
          borderColor: theme.border_color_thin,
          opacity: off ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.headRow}>
        <Txt variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {item.name}
        </Txt>
        {!off ? <Icon name="plus" size={18} /> : null}
      </View>
      <View style={styles.footRow}>
        <Txt variant="body">{formatVnd(item.price)}</Txt>
        <View style={styles.meta}>
          <Icon name="pin" size={12} color={theme.color_text_caption} />
          <Txt variant="tiny" muted>
            {off
              ? t(orderItemStatusKey['Hết món'])
              : low
                ? t('menuItemCard.lowStock', { count: remainingPortions })
                : categoryLabel}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 2,
    padding: 12,
    gap: 12,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  headRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  name: { flexShrink: 1 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
