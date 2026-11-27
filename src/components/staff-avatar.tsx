import { createContext, useContext, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from './ui/txt';

/** Hình chữ nhật của nút avatar theo toạ độ cửa sổ — modal Tài khoản bay ra từ đây. */
export type AvatarAnchor = { x: number; y: number; width: number; height: number };

export const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

type StaffAvatarValue = {
  name: string;
  /** Modal Tài khoản đang mở. */
  active: boolean;
  onPress: (anchor?: AvatarAnchor) => void;
};

const StaffAvatarContext = createContext<StaffAvatarValue | null>(null);

/** Layout của vai trò cấp thông tin nhân viên + hành động mở modal Tài khoản cho các nút avatar trong trang. */
export const StaffAvatarProvider = StaffAvatarContext.Provider;

/**
 * Nút avatar trên đầu trang, chỉ hiện ở màn hình dọc (thanh dưới không còn avatar).
 * Màn hình ngang dùng avatar cuối thanh bên của NavRail nên ở đó component này không hiện gì.
 */
export function StaffAvatarButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const ctx = useContext(StaffAvatarContext);
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const ref = useRef<View>(null);
  if (!ctx || height < width) return null;

  const press = () => {
    const node = ref.current;
    if (!node) return ctx.onPress();
    node.measureInWindow((x, y, w, h) => ctx.onPress({ x, y, width: w, height: h }));
  };

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={ctx.name}
      onPress={press}
      style={({ pressed }) => [
        styles.avatar,
        { borderColor: theme.border_color_base },
        (ctx.active || pressed) && { backgroundColor: theme.fill_tap },
        style,
      ]}>
      <Txt variant="label">{initials(ctx.name)}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
