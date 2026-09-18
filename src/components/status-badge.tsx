import { StyleSheet, View } from 'react-native';

import type { OrderItemStatus, TableStatus } from '@/src/data/types';
import { TABLE_STATUS_COLORS } from '@/src/theme/status-colors';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './ui/icon';
import { Txt } from './ui/txt';

type Variant = 'solid' | 'outline' | 'dashed' | 'muted' | 'hatch';
type Visual = { label: string; icon: IconName; variant: Variant };

const TABLE_STATUS_ICON: Record<TableStatus, IconName> = {
  Trống: 'available',
  'Đã đặt trước': 'reserved',
  'Đang phục vụ': 'occupied',
  'Tạm khoá': 'lock',
};

const ITEM_STATUS_VISUAL: Record<OrderItemStatus, Visual> = {
  'Trong hàng đợi': { label: 'Trong hàng đợi', icon: 'send', variant: 'outline' },
  'Đang làm': { label: 'Đang làm', icon: 'preparing', variant: 'solid' },
  Xong: { label: 'Xong', icon: 'check', variant: 'outline' },
  'Chờ bưng': { label: 'Chờ bưng', icon: 'bell', variant: 'solid' },
  'Đã phục vụ': { label: 'Đã phục vụ', icon: 'served', variant: 'muted' },
  'Hết món': { label: 'Hết món', icon: 'unavailable', variant: 'hatch' },
  Huỷ: { label: 'Đã huỷ', icon: 'unavailable', variant: 'muted' },
};

function Hatch({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 1.5,
            height: 64,
            backgroundColor: color,
            opacity: 0.45,
            left: i * 9 - 12,
            top: -20,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </View>
  );
}

function Badge({ visual, size = 'md' }: { visual: Visual; size?: 'sm' | 'md' }) {
  const theme = useAppTheme();
  const solid = visual.variant === 'solid' || visual.variant === 'hatch';
  const muted = visual.variant === 'muted';
  const fg = solid ? theme.color_text_base_inverse : theme.color_text_base;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {
          backgroundColor: solid
            ? theme.brand_primary
            : muted
              ? theme.fill_grey
              : 'transparent',
          borderColor: theme.border_color_base,
          borderWidth: solid ? 0 : 1,
          borderStyle: visual.variant === 'dashed' ? 'dashed' : 'solid',
          opacity: muted ? 0.75 : 1,
        },
      ]}>
      {visual.variant === 'hatch' && <Hatch color={theme.color_text_base_inverse} />}
      <Icon name={visual.icon} size={size === 'sm' ? 12 : 14} color={fg} strokeWidth={2.2} />
      <Txt variant={size === 'sm' ? 'tiny' : 'label'} color={fg} numberOfLines={1}>
        {visual.label}
      </Txt>
    </View>
  );
}

export function TableStatusBadge({ status, size }: { status: TableStatus; size?: 'sm' | 'md' }) {
  const c = TABLE_STATUS_COLORS[status];
  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: c.fill },
      ]}>
      <Icon name={TABLE_STATUS_ICON[status]} size={size === 'sm' ? 12 : 14} color={c.on} strokeWidth={2.2} />
      <Txt variant={size === 'sm' ? 'tiny' : 'label'} color={c.on} numberOfLines={1}>
        {status}
      </Txt>
    </View>
  );
}

export function ItemStatusBadge({ status, size }: { status: OrderItemStatus; size?: 'sm' | 'md' }) {
  return <Badge visual={ITEM_STATUS_VISUAL[status]} size={size} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
});
