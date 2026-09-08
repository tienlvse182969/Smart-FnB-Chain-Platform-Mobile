import { StyleSheet, View } from 'react-native';

import { IconButton } from './icon';
import { Txt } from './txt';

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'md' | 'sm';
}) {
  const s = size === 'sm' ? 30 : 36;
  return (
    <View style={styles.row}>
      <IconButton
        name="minus"
        size={size === 'sm' ? 14 : 16}
        variant="outlined"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ width: s, height: s }}
      />
      <Txt variant="title" style={styles.value}>
        {value}
      </Txt>
      <IconButton
        name="plus"
        size={size === 'sm' ? 14 : 16}
        variant="outlined"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={{ width: s, height: s }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { minWidth: 24, textAlign: 'center' },
});
