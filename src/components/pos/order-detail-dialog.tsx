import { toast } from '@/src/components/ui/toast';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStore } from '@/src/data/store';
import { OrderStatusBadge, PrintFailedBadge } from '../status-badge';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Txt } from '../ui/txt';
import { ReceiptPreview } from './receipt-preview';

/** Chi tiết một đơn trong lịch sử (CS-05): xem lại bill, in lại khi in thất bại (BR-21) — mỗi lần in lại được đếm. */
export function OrderDetailDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { orderById, reprint, state } = useStore();
  const order = orderId ? orderById(orderId) : undefined;
  if (!order) return null;

  const paid = order.callNumber !== undefined;

  return (
    <AppModal
      visible
      title={t('orders.detailTitle', { code: order.orderCode })}
      onClose={onClose}
      maxWidth={520}
      actions={[{ text: t('common.close'), onPress: onClose }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View style={styles.statusRow}>
          <View style={styles.badges}>
            <OrderStatusBadge status={order.status} />
            {order.printStatus === 'In thất bại' ? <PrintFailedBadge /> : null}
          </View>
          <Txt variant="caption" muted>
            {t('orders.cashier')}: {order.cashierName}
          </Txt>
        </View>

        {order.status === 'Đã huỷ' && order.cancelledReason ? (
          <Txt variant="caption" muted>
            {t('orders.cancelledReason', { reason: order.cancelledReason })}
          </Txt>
        ) : null}

        <ReceiptPreview order={order} />

        {paid ? (
          <>
            <Btn
              label={t('orders.reprint')}
              icon="print"
              block
              variant="ghost"
              onPress={() => {
                reprint(order.id);
                // in lại có thể vẫn lỗi nếu máy in còn offline (BR-21)
                if (state.printerOffline) {
                  toast.fail(t('orders.printFailedToast'), 1.5, undefined, false);
                } else {
                  toast.success(t('orders.reprinted', { count: order.reprintCount + 1 }), 1.5, undefined, false);
                }
              }}
            />
            <Txt variant="tiny" muted style={styles.note}>
              {t('orders.managerOnlyNote')}
            </Txt>
          </>
        ) : null}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 620 },
  body: { gap: 12 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  note: { textAlign: 'center' },
});
