import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';

/** Độ rộng cột phải theo độ rộng cả khung — giống giỏ hàng của POS. */
export const splitPanelWidth = (total: number) => Math.min(440, Math.max(320, total * 0.32));

/**
 * Bố cục chia đôi dùng chung cho màn Bán hàng (lưới món | giỏ hàng) và màn Hàng đợi pha chế
 * (lưới mẻ | sẵn sàng nhận): phần chính co giãn bên trái, cột phải cao hết màn hình, có viền trái.
 * `onMainWidth` báo độ rộng thật của phần chính để tính số cột lưới.
 */
export function SplitPanelLayout({
  panel,
  children,
  onMainWidth,
}: {
  panel: ReactNode;
  children: ReactNode;
  onMainWidth?: (width: number) => void;
}) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);

  return (
    <View style={styles.split} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.main} onLayout={(e) => onMainWidth?.(e.nativeEvent.layout.width)}>
        {children}
      </View>
      <View
        style={[
          styles.panel,
          { width: splitPanelWidth(width), backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
        ]}>
        {panel}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  panel: { borderLeftWidth: StyleSheet.hairlineWidth },
});
