import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from './txt';

/** Chip lọc chọn/không chọn — monochrome (fill khi chọn). */
export function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? theme.brand_primary : 'transparent',
          borderColor: selected ? theme.brand_primary : theme.border_color_base,
        },
        pressed && { opacity: 0.6 },
      ]}>
      <Txt
        variant="label"
        color={selected ? theme.color_text_base_inverse : theme.color_text_base}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
    borderWidth: 1,
  },
});
