import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';

import { OrderEntryPanel } from './order-entry-panel';

/** Cùng đường cong/khoảng thời gian với panel chi tiết bàn (table-panel-overlay.tsx) để 2 animation đồng bộ. */
const PANEL_MOTION = { duration: 550, easing: Easing.bezier(0.1, 0.9, 0.2, 1) };

type OrderPanelCtx = {
  openOrderPanel: (tableId: string) => void;
  closeOrderPanel: () => void;
};

const Ctx = createContext<OrderPanelCtx | null>(null);

export function useOrderPanel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrderPanel must be used within OrderPanelOverlay');
  return ctx;
}

/**
 * Bọc layout — giống hệt TablePanelOverlay — để màn hình ghi order trồi lên trên CẢ
 * panel chi tiết bàn (nơi nút "Ghi order" được bấm) lẫn nav rail, phủ kín toàn màn hình.
 * Đặt ở cấp layout để là anh em cùng cấp với mọi thứ khác trong cây view.
 */
export function OrderPanelOverlay({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

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
        openOrderPanel: setOpenId,
        closeOrderPanel: () => setOpenId(null),
      }}>
      {children}

      {panelId ? (
        <Animated.View
          pointerEvents={openId ? 'auto' : 'none'}
          style={[
            styles.panelWrap,
            {
              transform: [
                { translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) },
              ],
            },
          ]}>
          <OrderEntryPanel tableId={panelId} onClose={() => setOpenId(null)} />
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  panelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
});
