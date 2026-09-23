import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import type { MenuItem } from '@/src/data/types';
import { orderItemStatusKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

export function MenuItemCard({
  item,
  categoryLabel,
  available,
  remainingPortions,
  qtyInCart = 0,
  onPress,
  onDecrement,
}: {
  item: MenuItem;
  categoryLabel: string;
  available: boolean;
  remainingPortions?: number;
  qtyInCart?: number;
  onPress: () => void;
  onDecrement?: () => void;
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
          opacity: pressed && !off ? 0.7 : 1,
        },
      ]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.image }}
          style={[styles.image, off && styles.imageOff]}
          contentFit="cover"
          transition={150}
        />
        {off ? (
          <View style={[styles.offBadge, { backgroundColor: theme.fill_mask }]}>
            <Txt variant="caption" color={theme.color_text_base_inverse}>
              {t(orderItemStatusKey['Hết món'])}
            </Txt>
          </View>
        ) : qtyInCart > 0 ? (
          <View style={[styles.stepperBadge, { backgroundColor: theme.brand_primary }]}>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                onDecrement?.();
              }}
              style={styles.stepperBtn}>
              <Icon name="minus" size={14} color={theme.color_text_base_inverse} />
            </Pressable>
            <Txt variant="label" color={theme.color_text_base_inverse} style={styles.stepperQty}>
              {qtyInCart}
            </Txt>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                onPress();
              }}
              style={styles.stepperBtn}>
              <Icon name="plus" size={14} color={theme.color_text_base_inverse} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.addBadge, { backgroundColor: theme.brand_primary }]}>
            <Icon name="plus" size={16} color={theme.color_text_base_inverse} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Txt variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {item.name}
        </Txt>
        <View style={styles.footRow}>
          <Txt variant="body">{formatVnd(item.price)}</Txt>
          <View style={styles.meta}>
            <Icon name="pin" size={12} color={theme.color_text_caption} />
            <Txt variant="tiny" muted numberOfLines={1}>
              {low ? t('menuItemCard.lowStock', { count: remainingPortions }) : categoryLabel}
            </Txt>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageWrap: { aspectRatio: 1, width: '100%' },
  image: { width: '100%', height: '100%' },
  imageOff: { opacity: 0.45 },
  offBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  addBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 2,
  },
  stepperBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepperQty: { minWidth: 16, textAlign: 'center' },
  info: { padding: 12, gap: 10 },
  name: { minHeight: 40 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
});
