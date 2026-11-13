import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { GlassLayerProps } from './glass-layer';

/**
 * Bản web: trình duyệt tự blur phần phía sau bằng CSS `backdrop-filter`, không cần ảnh chụp.
 * Các prop frame/backdrop/source chỉ dùng cho native, ở đây bỏ qua.
 */
export const GlassLayer = memo(function GlassLayer({ blur = 20, veil }: GlassLayerProps) {
  // react-native-web chuyển thẳng style này thành CSS; RN chưa có kiểu cho backdropFilter.
  const glass = { backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` } as ViewStyle;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, glass, { backgroundColor: veil }]} />;
});
