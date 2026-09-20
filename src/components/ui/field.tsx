import { useState, type ReactNode } from 'react';
import { View, type TextInputProps, type ViewStyle } from 'react-native';

import { InputItem } from '@ant-design/react-native';
import type { InputItemStyle } from '@ant-design/react-native/lib/input-item/style';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
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
  ...rest
}: Omit<TextInputProps, 'style' | 'onChange'> & {
  label?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: ViewStyle;
}) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  const styles: Partial<InputItemStyle> = {
    container: {
      borderWidth: 1,
      borderRadius: 2,
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
        {...rest}
        value={value}
        onChange={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color_text_placeholder}
        type={secureTextEntry ? 'password' : (keyboardType as InputItemTypeCompat) ?? 'text'}
        labelPosition="left"
        labelNumber={left ? 1 : 0}
        clear={false}
        extra={right}
        styles={styles}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}>
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
