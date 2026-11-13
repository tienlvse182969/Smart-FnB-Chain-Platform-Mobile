import { Switch } from '@ant-design/react-native';
import { useTranslation } from 'react-i18next';
// Cố ý dùng Image của React Native (Fresco), KHÔNG dùng expo-image: Glide của expo-image mặc định tạo
// hardware bitmap, mà ảnh chụp màn hình cho nền kính mờ của AppModal (react-native-view-shot) vẽ bằng
// software canvas → hardware bitmap làm lần chụp thất bại trên Android (dialog mất blur).
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import type { MenuItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

/**
 * Chế độ bật/tắt còn bán (màn Kiểm tra món của pha chế): thay nút "+" bằng công tắc kèm chữ,
 * bỏ giá; bấm vào thân thẻ không làm gì để tránh lỡ tay báo hết món.
 */
export type MenuCardToggle = {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** khoá công tắc (Owner đã tắt, món chưa gán chi nhánh, đang lưu…) */
  disabled?: boolean;
  /** lý do khoá / ghi chú hiển thị dưới công tắc */
  note?: string;
  noteColor?: string;
};

export function MenuItemCard({
  item,
  categoryLabel,
  available,
  qtyInCart = 0,
  onPress,
  onDecrement,
  toggle,
  hideImage = false,
}: {
  item: MenuItem;
  categoryLabel: string;
  available: boolean;
  qtyInCart?: number;
  onPress?: () => void;
  onDecrement?: () => void;
  toggle?: MenuCardToggle;
  /** thẻ gọn không có ô ảnh (topping) */
  hideImage?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const pressable = !toggle && available && !!onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={!pressable}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.fill_base,
          borderColor: theme.border_color_thin,
          opacity: pressed && pressable ? 0.7 : 1,
        },
      ]}>
      {hideImage ? null : (
        <View style={styles.imageWrap}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={[styles.image, !available && styles.imageOff]}
              resizeMode="cover"
              // Ảnh menu là ảnh gốc upload (tới 5MB): giải nén theo kích thước ô thay vì full-size.
              resizeMethod="resize"
              fadeDuration={150}
            />
          ) : (
            <View
              style={[
                styles.image,
                styles.placeholder,
                { backgroundColor: theme.fill_body },
                !available && styles.imageOff,
              ]}>
              <Icon name="brand" size={32} color={theme.color_text_caption} strokeWidth={1.4} />
            </View>
          )}
          {!available ? (
            <View style={[styles.offBadge, { backgroundColor: theme.fill_mask }]}>
              <Txt variant="caption" color={theme.color_text_base_inverse}>
                {toggle ? t('baristaMenu.unavailable') : t('status.line.outOfStock')}
              </Txt>
            </View>
          ) : toggle ? null : qtyInCart > 0 ? (
            <View style={[styles.stepperBadge, { backgroundColor: theme.brand_primary }]}>
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  onDecrement?.();
                }}
                style={styles.stepperBtn}>
                <Icon name="minus" size={14} color={theme.brand_on_primary} />
              </Pressable>
              <Txt variant="label" color={theme.brand_on_primary} style={styles.stepperQty}>
                {qtyInCart}
              </Txt>
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  onPress?.();
                }}
                style={styles.stepperBtn}>
                <Icon name="plus" size={14} color={theme.brand_on_primary} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.addBadge, { backgroundColor: theme.brand_primary }]}>
              <Icon name="plus" size={16} color={theme.brand_on_primary} />
            </View>
          )}
        </View>
      )}

      <View style={styles.info}>
        <Txt variant="bodyStrong" numberOfLines={2} style={hideImage ? undefined : styles.name}>
          {item.name}
        </Txt>
        {toggle ? (
          <>
            <Txt variant="tiny" muted numberOfLines={1}>
              {categoryLabel}
            </Txt>
            <View style={styles.toggleRow}>
              <Switch checked={toggle.checked} disabled={toggle.disabled} onChange={toggle.onChange} />
              <Txt
                variant="label"
                numberOfLines={1}
                style={styles.toggleLabel}
                color={toggle.checked ? theme.brand_success : theme.brand_error}>
                {toggle.checked ? t('baristaMenu.available') : t('baristaMenu.unavailable')}
              </Txt>
            </View>
            {toggle.note ? (
              <Txt variant="tiny" color={toggle.noteColor ?? theme.color_text_caption} numberOfLines={2}>
                {toggle.note}
              </Txt>
            ) : null}
          </>
        ) : (
          <View style={styles.footRow}>
            <Txt variant="body">{formatVnd(item.price)}</Txt>
            <Txt variant="tiny" muted numberOfLines={1} style={styles.category}>
              {categoryLabel}
            </Txt>
          </View>
        )}
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
  placeholder: { alignItems: 'center', justifyContent: 'center' },
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
  category: { flexShrink: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { flexShrink: 1 },
});
