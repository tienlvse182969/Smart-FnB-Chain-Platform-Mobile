import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { LineStatus, OrderStatus } from '@/src/data/types';
import { lineStatusKey, orderStatusKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './ui/icon';
import { Txt } from './ui/txt';

type Variant = 'solid' | 'outline' | 'muted' | 'danger';
type Visual = { labelKey: string; icon: IconName; variant: Variant };

const ORDER_VISUAL: Record<OrderStatus, Visual> = {
  'Chờ thanh toán': { labelKey: orderStatusKey['Chờ thanh toán'], icon: 'timer', variant: 'outline' },
  'Đã thanh toán': { labelKey: orderStatusKey['Đã thanh toán'], icon: 'payment', variant: 'outline' },
  'Đang pha': { labelKey: orderStatusKey['Đang pha'], icon: 'preparing', variant: 'solid' },
  'Sẵn sàng': { labelKey: orderStatusKey['Sẵn sàng'], icon: 'bell', variant: 'solid' },
  'Hoàn tất': { labelKey: orderStatusKey['Hoàn tất'], icon: 'served', variant: 'muted' },
  'Đã huỷ': { labelKey: orderStatusKey['Đã huỷ'], icon: 'unavailable', variant: 'muted' },
};

const LINE_VISUAL: Record<LineStatus, Visual> = {
  'Chờ pha': { labelKey: lineStatusKey['Chờ pha'], icon: 'timer', variant: 'outline' },
  'Đang pha': { labelKey: lineStatusKey['Đang pha'], icon: 'preparing', variant: 'solid' },
  Xong: { labelKey: lineStatusKey.Xong, icon: 'check', variant: 'outline' },
  'Hết món': { labelKey: lineStatusKey['Hết món'], icon: 'unavailable', variant: 'danger' },
  Huỷ: { labelKey: lineStatusKey.Huỷ, icon: 'unavailable', variant: 'muted' },
};

const PRINT_FAILED_VISUAL: Visual = { labelKey: 'status.print.failed', icon: 'print', variant: 'danger' };

function Badge({ visual, size }: { visual: Visual; size: 'sm' | 'md' }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const small = size === 'sm';

  const danger = '#C0392B';
  const solid = visual.variant === 'solid';
  const fg = solid
    ? theme.color_text_base_inverse
    : visual.variant === 'danger'
      ? danger
      : theme.color_text_base;

  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSm,
        {
          backgroundColor: solid ? theme.brand_primary : 'transparent',
          borderColor: visual.variant === 'danger' ? danger : theme.border_color_base,
          opacity: visual.variant === 'muted' ? 0.6 : 1,
        },
      ]}>
      <Icon name={visual.icon} size={small ? 11 : 13} color={fg} />
      <Txt variant={small ? 'tiny' : 'label'} color={fg}>
        {t(visual.labelKey)}
      </Txt>
    </View>
  );
}

export function OrderStatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  return <Badge visual={ORDER_VISUAL[status]} size={size} />;
}

export function LineStatusBadge({ status, size = 'md' }: { status: LineStatus; size?: 'sm' | 'md' }) {
  return <Badge visual={LINE_VISUAL[status]} size={size} />;
}

/** Nhãn đỏ khi in bill/phiếu số thất bại (BR-21) — chỉ hiện khi lỗi, in thành công thì không cần nhãn. */
export function PrintFailedBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return <Badge visual={PRINT_FAILED_VISUAL} size={size} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2, gap: 4 },
});
