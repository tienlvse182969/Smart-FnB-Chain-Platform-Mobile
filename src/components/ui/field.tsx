import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from './txt';

export function Field({
  label,
  left,
  right,
  containerStyle,
  ...rest
}: Omit<TextInputProps, 'style'> & {
  label?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: ViewStyle;
}) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="label" muted style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.box,
          {
            borderColor: focused ? theme.brand_primary : theme.border_color_base,
            backgroundColor: theme.fill_base,
          },
        ]}>
        {left}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.color_text_placeholder}
          style={[styles.input, { color: theme.color_text_base }]}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 5 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, paddingVertical: 10 },
});
