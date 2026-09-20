import { Tag } from '@ant-design/react-native';
import type { TagStyle } from '@ant-design/react-native/lib/tag/style';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

/** Chip lọc chọn/không chọn — dựng trên antd `Tag`, override style cho monochrome. */
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

  const styles: Partial<TagStyle> = {
    wrap: { height: 32, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 8, borderWidth: 1 },
    text: { fontFamily: fontFamily.regular, fontSize: 13 },
    normalWrap: { backgroundColor: 'transparent', borderColor: theme.border_color_base },
    normalText: { color: theme.color_text_base },
    activeWrap: { backgroundColor: theme.brand_primary, borderColor: theme.brand_primary },
    activeText: { color: theme.color_text_base_inverse },
  };

  return (
    <Tag selected={selected} onChange={() => onPress?.()} styles={styles}>
      {label}
    </Tag>
  );
}
