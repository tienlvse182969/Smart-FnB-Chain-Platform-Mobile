import { Button } from '@ant-design/react-native';
import type { ButtonStyles } from '@ant-design/react-native/lib/button/style';
import { View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

type Variant = 'primary' | 'ghost' | 'plain';
type Size = 'md' | 'sm';

/** Nút dựng trên antd `Button` — chiều cao/bo góc/màu override qua `styles` để khớp theme B&W. */
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
  const fg = solid ? theme.brand_on_primary : theme.color_text_base;
  const raw: 'smallRaw' | 'largeRaw' = size === 'sm' ? 'smallRaw' : 'largeRaw';

  // antd `Button` (qua `WithTheme`) cache style theo theme lúc mount đầu tiên: mount trước khi nhận diện chuỗi
  // tải xong thì nền kẹt màu đen nền tảng trong khi chữ `brand_on_primary` đã đổi theo chuỗi → chữ đen trên nền đen.
  // `styles` được merge lại mỗi lần render, nên ép màu chủ đạo từ theme hiện tại vào đây.
  const styles: Partial<ButtonStyles> = {
    wrapperStyle: { borderRadius: 8 },
    primaryRaw: { backgroundColor: theme.primary_button_fill, borderColor: theme.primary_button_fill },
    primaryHighlight: {
      backgroundColor: `${theme.primary_button_fill_tap}4D`,
      borderColor: theme.primary_button_fill,
    },
    primaryRawText: { color: theme.brand_on_primary },
    primaryHighlightText: { color: `${theme.brand_on_primary}4D` },
    primaryDisabledRawText: { color: `${theme.brand_on_primary}99` },
    [raw]: { paddingHorizontal: size === 'sm' ? 12 : 16, minHeight: size === 'sm' ? 32 : 42 },
    ghostRaw: { borderColor: variant === 'plain' ? 'transparent' : theme.border_color_base },
    ghostDisabledRaw: { borderColor: variant === 'plain' ? 'transparent' : theme.fill_disabled },
  };

  return (
    <Button
      type={solid ? 'primary' : 'ghost'}
      size={size === 'sm' ? 'small' : 'large'}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      style={{ ...(block ? { alignSelf: 'stretch' as const } : null), ...style }}
      styles={styles}>
      {loading ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
          <Txt variant="bodyStrong" color={fg}>
            {label}
          </Txt>
        </View>
      )}
    </Button>
  );
}
