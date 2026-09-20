import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/theme/use-theme';
import { TableDetailPanel } from './table-detail-panel';

/** WinJS showPanel/hidePanel (Windows 8.1): 550ms, đường cong giảm tốc mũ, trượt thuần không fade. */
const PANEL_MOTION = { duration: 550, easing: Easing.bezier(0.1, 0.9, 0.2, 1) };

type TablePanelCtx = {
  openTablePanel: (tableId: string) => void;
  closeTablePanel: () => void;
};

const Ctx = createContext<TablePanelCtx | null>(null);

export function useTablePanel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTablePanel must be used within TablePanelOverlay');
  return ctx;
}

/**
 * Bọc layout (NavRail + nội dung màn hình) để panel chi tiết bàn và lớp phủ đen của nó
 * trồi lên trên CẢ nav rail bên trái — không chỉ nội dung màn hình. Đặt ở cấp layout
 * (không phải trong từng màn hình) để panel/backdrop là anh em cùng cấp với NavRail
 * trong cây view, nhờ đó thứ tự vẽ (khai báo sau cùng = trên cùng) phủ kín toàn màn hình.
 */
export function TablePanelOverlay({
  railWidth,
  children,
}: {
  railWidth: number;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  const panelWidth = Math.min(440, Math.max(340, width - railWidth - 80));

  useEffect(() => {
    if (openId) setPanelId(openId);
  }, [openId]);

  // Chỉ trượt sau khi panel đã mount + vẽ xong, nếu không lần render đầu nuốt mất frame đầu của slide.
  useEffect(() => {
    if (!openId && !panelId) return;
    if (openId && panelId !== openId) return;
    const frame = requestAnimationFrame(() => {
      Animated.timing(panelAnim, {
        toValue: openId ? 1 : 0,
        ...PANEL_MOTION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !openId) setPanelId(null);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [openId, panelId, panelAnim]);

  return (
    <Ctx.Provider
      value={{
        openTablePanel: setOpenId,
        closeTablePanel: () => setOpenId(null),
      }}>
      {children}

      {panelId ? (
        <Animated.View
          pointerEvents={openId ? 'auto' : 'none'}
          style={[
            styles.backdrop,
            { opacity: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) },
          ]}
        />
      ) : null}

      {panelId ? (
        <Animated.View
          pointerEvents={openId ? 'auto' : 'none'}
          style={[
            styles.panelWrap,
            {
              width: panelWidth,
              top: insets.top,
              right: insets.right,
              bottom: insets.bottom,
              backgroundColor: theme.fill_body,
              borderLeftColor: theme.border_color_thin,
              transform: [
                {
                  translateX: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [panelWidth, 0],
                  }),
                },
              ],
            },
          ]}>
          <TableDetailPanel
            embedded
            id={panelId}
            onClose={() => setOpenId(null)}
            onNavigate={(toId) => setOpenId(toId)}
          />
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  panelWrap: {
    position: 'absolute',
    borderLeftWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 8,
  },
});
