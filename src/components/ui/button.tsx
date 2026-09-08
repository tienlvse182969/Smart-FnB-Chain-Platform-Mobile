import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

type Variant = 'primary' | 'ghost' | 'plain';
type Size = 'md' | 'sm';

/**
 * Nút dùng token của antd theme (brand_primary / border_color_base / radius).
 * antd `Button` cao cứng 47px + khó gắn icon nên tự dựng bằng Pressable cho gọn.
 */
export function Btn({
  label,
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  block,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  const solid = variant === 'primary';
  const fg = solid ? theme.color_text_base_inverse : theme.color_text_base;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        block && styles.block,
        {
          backgroundColor: solid ? theme.brand_primary : 'transparent',
          borderColor: variant === 'plain' ? 'transparent' : theme.border_color_base,
        },
        pressed && { opacity: 0.65 },
        (disabled || loading) && { opacity: 0.35 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
          <Txt variant="bodyStrong" color={fg}>
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 2,
  },
  md: { minHeight: 42, paddingHorizontal: 16 },
  sm: { minHeight: 32, paddingHorizontal: 12 },
  block: { alignSelf: 'stretch' },
});
