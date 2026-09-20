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
  const fg = solid ? theme.color_text_base_inverse : theme.color_text_base;
  const raw: 'smallRaw' | 'largeRaw' = size === 'sm' ? 'smallRaw' : 'largeRaw';

  const styles: Partial<ButtonStyles> = {
    wrapperStyle: { borderRadius: 8 },
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
