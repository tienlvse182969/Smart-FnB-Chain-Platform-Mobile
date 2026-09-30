import { Toast } from '@ant-design/react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { cancelUnpaidOrder, collectCash, type CounterOrder } from '@/src/services/cashier-api';
import { useStation } from '@/src/stations/station-context';
import { fontFamily } from '@/src/theme/typography';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Txt } from '@/src/components/ui/txt';

export function ServerCheckoutDialog({
  order,
  onClose,
}: {
  order: CounterOrder | null;
  onClose: (paid: boolean) => void;
}) {
  const { selectedStation } = useStation();
  const [tendered, setTendered] = useState('');
  const [paidOrder, setPaidOrder] = useState<CounterOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPaidOrder(null);
    setTendered(order ? String(Number(order.totalAmount)) : '');
  }, [order]);

  const total = Number(order?.totalAmount ?? 0);
  const tenderedAmount = Number(tendered.replace(/[^0-9]/g, ''));
  const change = useMemo(() => Math.max(0, tenderedAmount - total), [tenderedAmount, total]);
  if (!order) return null;

  const dismiss = async () => {
    if (submitting) return;
    if (!paidOrder) {
      setSubmitting(true);
      try {
        await cancelUnpaidOrder(order.id, 'Thu ngân quay lại sửa đơn');
      } catch (reason) {
        Toast.fail(reason instanceof Error ? reason.message : 'Không thể hủy đơn', 2, undefined, false);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }
    onClose(!!paidOrder);
  };

  const confirmCash = async () => {
    if (!selectedStation || tenderedAmount < total || submitting) return;
    setSubmitting(true);
    try {
      const result = await collectCash(order.id, selectedStation.id, tenderedAmount);
      setPaidOrder(result.order);
    } catch (reason) {
      Toast.fail(reason instanceof Error ? reason.message : 'Không thể ghi nhận thanh toán', 3, undefined, false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible
      title={paidOrder ? 'Thanh toán thành công' : `Thanh toán ${order.orderCode}`}
      icon={paidOrder ? 'done' : 'cash'}
      onClose={() => void dismiss()}
      maxWidth={520}
      actions={paidOrder ? [{ text: 'Đơn mới', onPress: () => void dismiss(), primary: true }] : undefined}>
      {paidOrder ? (
        <View style={styles.success}>
          <Txt variant="caption" muted>SỐ GỌI</Txt>
          <Txt style={styles.callNumber}>{String(paidOrder.callNumber ?? 0).padStart(3, '0')}</Txt>
          <Txt variant="body">Đơn đã được chuyển tới màn hình pha chế.</Txt>
          <Txt variant="caption" muted>Lệnh in hóa đơn và phiếu số đã được tạo cho quầy hiện tại.</Txt>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.totalBox}>
            <Txt variant="caption" muted>TỔNG THANH TOÁN</Txt>
            <Txt style={styles.total}>{formatVnd(total)}</Txt>
          </View>
          <Field
            label="Tiền khách đưa"
            value={tendered}
            onChangeText={setTendered}
            keyboardType="number-pad"
          />
          <View style={styles.row}>
            <Txt muted>Tiền thừa</Txt>
            <Txt variant="bodyStrong">{formatVnd(change)}</Txt>
          </View>
          {tenderedAmount < total ? <Txt color="#C0392B">Số tiền khách đưa chưa đủ.</Txt> : null}
          <Btn
            label="Xác nhận đã thu tiền"
            icon="cash"
            block
            loading={submitting}
            disabled={tenderedAmount < total}
            onPress={() => void confirmCash()}
          />
          <Btn label="Quay lại sửa đơn" variant="plain" disabled={submitting} onPress={() => void dismiss()} />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  totalBox: { alignItems: 'center', gap: 4 },
  total: { fontFamily: fontFamily.black, fontSize: 36, lineHeight: 44 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  success: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  callNumber: { fontFamily: fontFamily.black, fontSize: 64, lineHeight: 72 },
});
