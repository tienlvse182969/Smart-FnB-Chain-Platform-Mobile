import { useState, type ReactNode } from 'react';
import { Pressable, View, type TextInputProps, type ViewStyle } from 'react-native';

import { InputItem } from '@ant-design/react-native';
import type { InputItemStyle } from '@ant-design/react-native/lib/input-item/style';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from './icon';
import { Txt } from './txt';

/** Ô nhập dựng trên antd `InputItem` — border/box override để khớp theme B&W thay vì kiểu list-item mặc định. */
export function Field({
  label,
  left,
  right,
  containerStyle,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  placeholder,
  onFocus,
  onBlur,
  ...rest
}: Omit<TextInputProps, 'style' | 'onChange' | 'onFocus' | 'onBlur'> & {
  onFocus?: () => void;
  onBlur?: () => void;
  label?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: ViewStyle;
}) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  // Ô mật khẩu có nút con mắt để xem lại ký tự đã nhập (trừ khi nơi dùng tự truyền `right`).
  const [revealed, setRevealed] = useState(false);
  const masked = !!secureTextEntry && !revealed;
  const trailing =
    right ??
    (secureTextEntry ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        hitSlop={10}
        onPress={() => setRevealed((v) => !v)}
        style={{ paddingLeft: 8 }}>
        <Icon name={revealed ? 'hide' : 'show'} size={18} color={theme.color_text_caption} />
      </Pressable>
    ) : undefined);

  const styles: Partial<InputItemStyle> = {
    container: {
      borderWidth: 1,
      borderRadius: 8,
      height: 46,
      borderColor: focused ? theme.brand_primary : theme.border_color_base,
      backgroundColor: theme.fill_base,
      marginLeft: 0,
      paddingHorizontal: 12,
    },
    input: { fontFamily: fontFamily.regular, fontSize: 15, color: theme.color_text_base },
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="label" muted style={{ marginBottom: 5 }}>
          {label}
        </Txt>
      ) : null}
      <InputItem
        {...(secureTextEntry ? { autoCapitalize: 'none' as const, autoCorrect: false } : null)}
        {...rest}
        value={value}
        onChange={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color_text_placeholder}
        type={masked ? 'password' : secureTextEntry ? 'text' : (keyboardType as InputItemTypeCompat) ?? 'text'}
        labelPosition="left"
        labelNumber={left ? 1 : 0}
        clear={false}
        extra={trailing}
        styles={styles}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}>
        {left}
      </InputItem>
    </View>
  );
}

type InputItemTypeCompat =
  | 'text'
  | 'bankCard'
  | 'phone'
  | 'password'
  | 'number'
  | 'digit'
  | 'default'
  | 'email-address'
  | 'numeric'
  | 'phone-pad'
  | 'number-pad'
  | 'decimal-pad'
  | 'url';
