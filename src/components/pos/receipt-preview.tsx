import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';

import { branchName } from '@/src/data/mock';
import { clockAt, formatVnd } from '@/src/data/format';
import type { HistoryOrder, Order } from '@/src/data/types';
import { paymentMethodKey } from '@/src/i18n/labels';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from '../ui/txt';

/**
 * Xem trước bill và phiếu số in kèm sau thanh toán (CS-04, BR-21). Chưa in thật: bản có backend dựng
 * bill thành ảnh rồi POS gửi lệnh ESC/POS tới máy in nhiệt của quầy (GĐ-15). Có logo và tên chuỗi như mục 10.3.
 */
export function ReceiptPreview({
  order,
  branchName: branch = branchName,
}: {
  order: Order | HistoryOrder;
  /** tên chi nhánh thật (từ receipt API); mặc định dùng tên mock */
  branchName?: string;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
      <Image source={require('@/assets/logo/logo1.png')} style={styles.logo} resizeMode="contain" />
      <Txt variant="caption" muted style={styles.center}>
        {branch}
      </Txt>
      <Txt variant="caption" muted style={styles.center}>
        {t('orders.orderCode', { code: order.orderCode })}
        {order.paidAt ? ` · ${clockAt(order.paidAt)}` : ''}
      </Txt>

      <View style={[styles.divider, { borderColor: theme.border_color_base }]} />

      {order.lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <View style={styles.lineHead}>
            <Txt variant="bodyStrong" style={styles.lineName} numberOfLines={2}>
              {l.qty} × {l.name}
              {l.sizeLabel ? ` (${l.sizeLabel})` : ''}
            </Txt>
            <Txt variant="bodyStrong">{formatVnd(l.unitPrice * l.qty)}</Txt>
          </View>
          {l.options.filter((o) => o.groupId !== 'size').length || l.note ? (
            <Txt variant="caption" muted>
              {[
                ...l.options.filter((o) => o.groupId !== 'size').map((o) => o.label),
                l.note ? `“${l.note}”` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          ) : null}
        </View>
      ))}

      <View style={[styles.divider, { borderColor: theme.border_color_base }]} />

      <View style={styles.totalRow}>
        <Txt variant="title">{t('orders.total')}</Txt>
        <Txt variant="title">{formatVnd(order.total)}</Txt>
      </View>
      {order.payment ? (
        <>
          <View style={styles.totalRow}>
            <Txt variant="caption" muted>
              {t('orders.method')}
            </Txt>
            <Txt variant="caption">{t(paymentMethodKey[order.payment.method])}</Txt>
          </View>
        </>
      ) : null}

      {order.callNumber !== undefined ? (
        <View style={[styles.slip, { borderColor: theme.border_color_base }]}>
          <Txt variant="caption" muted>
            {t('receipt.callNumberSlip')}
          </Txt>
          <Txt style={styles.slipNumber}>{String(order.callNumber).padStart(3, '0')}</Txt>
          <Txt variant="tiny" muted style={styles.center}>
            {t('receipt.showToPickup')}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, padding: 16, gap: 4 },
  logo: { width: 120, height: 48, alignSelf: 'center' },
  center: { textAlign: 'center' },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: 8 },
  line: { gap: 2, marginBottom: 6 },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineName: { flexShrink: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  slip: {
    marginTop: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    paddingTop: 12,
    alignItems: 'center',
    gap: 2,
  },
  slipNumber: { fontFamily: fontFamily.black, fontSize: 44, lineHeight: 52 },
});
