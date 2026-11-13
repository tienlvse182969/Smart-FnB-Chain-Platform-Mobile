import { memo } from 'react';
import { Image, PixelRatio, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import type { GlassBackdrop, WindowRect } from './types';

export type GlassLayerProps = {
  /** Vị trí tấm kính trên màn hình (toạ độ cửa sổ). Chưa đo được thì chỉ vẽ lớp trắng. */
  frame: Pick<WindowRect, 'x' | 'y'> | null;
  /** Ảnh chụp màn hình phía sau (AppModal). */
  backdrop?: GlassBackdrop | null;
  /** Hoặc: ảnh nền tĩnh đã biết (vd. màn login) + vùng nó phủ trên màn hình, vẽ kiểu `cover`. */
  source?: ImageSourcePropType;
  sourceRect?: WindowRect | null;
  /** Độ nhoè, tính theo dp trên màn hình. */
  blur?: number;
  /** Lớp màu phủ lên ảnh đã blur — quyết định độ "đục" và độ dễ đọc chữ. */
  veil: string;
};

/**
 * Lớp nền kính mờ: đặt đúng phần ảnh nằm sau tấm kính (định vị theo toạ độ cửa sổ), blur bằng `Image`
 * `blurRadius` (Fresco blur một lần lúc giải mã), phủ lớp màu `veil`.
 * Đặt làm con đầu tiên (absoluteFill) của khung có `overflow: 'hidden'` để bo góc.
 */
export const GlassLayer = memo(function GlassLayer({ frame, backdrop, source, sourceRect, blur = 20, veil }: GlassLayerProps) {
  const imageSource = backdrop ? { uri: backdrop.uri } : source;
  const rect = backdrop ?? sourceRect;
  // Ảnh nền (ảnh chụp ~1 px/dp, ảnh login ~1 px/dp) bị blur ở độ phân giải gốc với bán kính đổi sang px
  // theo mật độ màn hình → chia lại cho mật độ để độ nhoè trên màn hình ≈ `blur` dp.
  const blurRadius = Math.max(1, Math.round(blur / PixelRatio.get()));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {imageSource && rect && frame ? (
        <Image
          source={imageSource}
          blurRadius={blurRadius}
          resizeMode={backdrop ? 'stretch' : 'cover'}
          fadeDuration={0}
          style={{
            position: 'absolute',
            left: rect.x - frame.x,
            top: rect.y - frame.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: veil }]} />
    </View>
  );
});
