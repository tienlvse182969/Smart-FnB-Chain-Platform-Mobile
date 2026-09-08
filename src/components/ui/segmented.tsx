import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from './txt';

/** Segmented control tự dựng (antd-mobile-rn v5 đã bỏ SegmentedControl). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  style?: object;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.wrap,
        { borderColor: theme.border_color_base, backgroundColor: theme.fill_base },
        style,
      ]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.seg,
              { backgroundColor: active ? theme.brand_primary : 'transparent' },
            ]}>
            <Txt
              variant="bodyStrong"
              color={active ? theme.color_text_base_inverse : theme.color_text_base}>
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
