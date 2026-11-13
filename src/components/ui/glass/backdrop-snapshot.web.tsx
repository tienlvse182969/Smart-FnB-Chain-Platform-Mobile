import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GlassCapture, WindowRect } from './types';

/**
 * Bản web: không cần chụp màn hình — trình duyệt tự blur phần phía sau bằng CSS `backdrop-filter`
 * (xem glass-layer.web.tsx).
 */
const BackdropSnapshotContext = createContext<GlassCapture>(async () => null);

export function measureWindowRect(view: View): Promise<WindowRect> {
  return new Promise((resolve) => view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })));
}

export function BackdropSnapshotRoot({ children }: { children: ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

export function useBackdropCapture(): GlassCapture {
  return useContext(BackdropSnapshotContext);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
