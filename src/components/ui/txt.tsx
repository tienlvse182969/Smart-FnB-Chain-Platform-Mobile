import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { text } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type Variant = keyof typeof text;

export function Txt({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; muted?: boolean }) {
  const theme = useAppTheme();
  const base: TextStyle = {
    color: color ?? theme.color_text_base,
    opacity: muted ? 0.6 : 1,
  };
  return <RNText {...rest} style={[text[variant], base, style]} />;
}
