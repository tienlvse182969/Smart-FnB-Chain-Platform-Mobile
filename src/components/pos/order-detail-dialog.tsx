import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toast } from '@/src/components/ui/toast';
import type { HistoryOrder } from '@/src/data/types';
import { getOrderReceipt, reprintOrder, type OrderReceipt } from '@/src/services/cashier-api';
import { OrderStatusBadge } from '../status-badge';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Field } from '../ui/field';
import { Txt } from '../ui/txt';
import { ReceiptPreview } from './receipt-preview';

const MIN_REASON_LENGTH = 3;

/** Chi tiết một đơn trong lịch sử (CS-05): xem lại bill, in lại kèm lý do — backend ghi nhận mỗi lần in lại (BR-21). */
export function OrderDetailDialog({ order, onClose }: { order: HistoryOrder | null; onClose: () => void }) {
  const { t } = useTranslation();
  const orderId = order?.id;
  const paid = order?.callNumber !== undefined;
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [reprintCount, setReprintCount] = useState(0);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setReceipt(null);
    setReprintCount(0);
    setReasonOpen(false);
    setReason('');
    if (!orderId || !paid) return;
    let active = true;
    getOrderReceipt(orderId)
      .then((result) => {
        if (active) setReceipt(result);
      })
      .catch(() => {
        // bill vẫn xem được từ dữ liệu danh sách; chỉ thiếu tên thu ngân / chi nhánh
      });
    return () => {
      active = false;
    };
  }, [orderId, paid]);

  if (!order) return null;

  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  const submitReprint = async () => {
    if (!reasonValid || printing) return;
    setPrinting(true);
    try {
      await reprintOrder(order.id, reason);
      const count = reprintCount + 1;
      setReprintCount(count);
      setReasonOpen(false);
      setReason('');
      toast.success(t('orders.reprinted', { count }), 1.5, undefined, false);
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('orders.reprintFailed'), 2, undefined, false);
    } finally {
      setPrinting(false);
    }
  };

  const cashierName = receipt?.cashier ?? order.cashierName;

  return (
    <AppModal
      visible
      title={t('orders.detailTitle', { code: order.orderCode })}
      onClose={onClose}
      maxWidth={520}
      actions={[{ text: t('common.close'), onPress: onClose }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.statusRow}>
          <View style={styles.badges}>
            <OrderStatusBadge status={order.status} />
          </View>
          {cashierName ? (
            <Txt variant="caption" muted>
              {t('orders.cashier')}: {cashierName}
            </Txt>
          ) : null}
        </View>

        {order.status === 'Đã huỷ' && order.cancelledReason ? (
          <Txt variant="caption" muted>
            {t('orders.cancelledReason', { reason: order.cancelledReason })}
          </Txt>
        ) : null}

        <ReceiptPreview order={order} branchName={receipt?.seller.branchName} />

        {paid ? (
          <>
            {reasonOpen ? (
              <View style={styles.reasonBox}>
                <Field
                  label={t('orders.reprintReason')}
                  placeholder={t('orders.reprintReasonPlaceholder')}
                  value={reason}
                  onChangeText={setReason}
                  maxLength={500}
                />
                <View style={styles.reasonActions}>
                  <Btn label={t('common.cancel')} variant="ghost" onPress={() => setReasonOpen(false)} />
                  <Btn
                    label={t('orders.reprintConfirm')}
                    icon="print"
                    disabled={!reasonValid || printing}
                    onPress={submitReprint}
                  />
                </View>
              </View>
            ) : (
              <Btn
                label={t('orders.reprint')}
                icon="print"
                block
                variant="ghost"
                onPress={() => setReasonOpen(true)}
              />
            )}
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
  reasonBox: { gap: 10 },
  reasonActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  note: { textAlign: 'center' },
});
