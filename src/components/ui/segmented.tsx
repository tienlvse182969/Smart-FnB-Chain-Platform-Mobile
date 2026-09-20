import { View } from 'react-native';

import { Pill } from './pill';

/** Segmented control (antd-mobile-rn v5 không có sẵn) — dựng bằng hàng antd `Tag` chọn đơn. */
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
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {options.map((opt) => (
        <Pill
          key={opt.value}
          label={opt.label}
          selected={opt.value === value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}
