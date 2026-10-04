import { toast } from '@/src/components/ui/toast';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { formatVnd } from '@/src/data/format';
import {
  cancelUnpaidOrder,
  collectCash,
  createPayosPayment,
  getCounterOrder,
  type CounterOrder,
  type PayosPayment,
} from '@/src/services/cashier-api';
import { useStation } from '@/src/stations/station-context';
import { fontFamily } from '@/src/theme/typography';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Txt } from '@/src/components/ui/txt';
import { Segmented } from '@/src/components/ui/segmented';
import {
  type DisplaySnapshot,
  updateCustomerDisplay,
} from '@/src/services/customer-display-realtime';

type PaymentTab = 'cash' | 'qr';

export function ServerCheckoutDialog({
  order,
  cartSnapshot,
  onClose,
}: {
  order: CounterOrder | null;
  cartSnapshot: DisplaySnapshot;
  onClose: (paid: boolean) => void;
}) {
  const { selectedStation } = useStation();
  const [tendered, setTendered] = useState('');
  const [paidOrder, setPaidOrder] = useState<CounterOrder | null>(null);
  const [tab, setTab] = useState<PaymentTab>('cash');
  const [qrPayment, setQrPayment] = useState<PayosPayment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPaidOrder(null);
    setTab('cash');
    setQrPayment(null);
    setTendered(order ? String(Number(order.totalAmount)) : '');
  }, [order]);

  useEffect(() => {
    if (!order || !selectedStation) return;
    void updateCustomerDisplay(selectedStation.id, {
      ...cartSnapshot,
      state: 'PAYMENT_PENDING',
      orderCode: order.orderCode,
    });
  }, [cartSnapshot, order, selectedStation]);

  useEffect(() => {
    if (!order || !qrPayment || paidOrder) return;
    const poll = setInterval(() => {
      void getCounterOrder(order.id)
        .then((latest) => {
          if (latest.paymentStatus === 'PAID') {
            setPaidOrder(latest);
            if (selectedStation) {
              void updateCustomerDisplay(selectedStation.id, {
                ...cartSnapshot,
                state: 'PAID',
                orderCode: latest.orderCode,
                callNumber: latest.callNumber ?? undefined,
              });
            }
          }
          else if (latest.status === 'CANCELLED') {
            toast.info('Mã QR đã hết hạn. Giỏ hàng được giữ lại để bạn chốt lại đơn.', 3, undefined, false);
            if (selectedStation) void updateCustomerDisplay(selectedStation.id, cartSnapshot);
            onClose(false);
          }
        })
        .catch(() => undefined);
    }, 2_000);
    return () => clearInterval(poll);
  }, [cartSnapshot, onClose, order, paidOrder, qrPayment, selectedStation]);

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
        if (selectedStation) void updateCustomerDisplay(selectedStation.id, cartSnapshot);
      } catch (reason) {
        toast.fail(reason instanceof Error ? reason.message : 'Không thể hủy đơn', 2, undefined, false);
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
      void updateCustomerDisplay(selectedStation.id, {
        ...cartSnapshot,
        state: 'PAID',
        orderCode: result.order.orderCode,
        callNumber: result.order.callNumber ?? undefined,
        paymentMethod: 'CASH',
      });
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : 'Không thể ghi nhận thanh toán', 3, undefined, false);
    } finally {
      setSubmitting(false);
    }
  };

  const showQr = async () => {
    if (submitting || qrPayment) return;
    setSubmitting(true);
    try {
      const payment = await createPayosPayment(order.id);
      setQrPayment(payment);
      if (selectedStation && payment.qrCode) {
        void updateCustomerDisplay(selectedStation.id, {
          ...cartSnapshot,
          state: 'PAYMENT_QR',
          orderCode: order.orderCode,
          paymentMethod: 'PAYOS',
          qrCode: payment.qrCode,
          qrExpiresAt: payment.expiresAt ?? undefined,
        });
      }
    } catch (reason) {
      toast.fail(reason instanceof Error ? reason.message : 'Không thể tạo mã QR', 3, undefined, false);
    } finally {
      setSubmitting(false);
    }
  };

  const changeTab = (next: PaymentTab) => {
    if (qrPayment && next === 'cash') {
      toast.info('Mã QR đang hoạt động. Hãy chờ thanh toán hoặc mã hết hạn.', 2, undefined, false);
      return;
    }
    setTab(next);
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
          <Segmented<PaymentTab>
            value={tab}
            onChange={changeTab}
            options={[
              { value: 'cash', label: 'Tiền mặt' },
              { value: 'qr', label: 'Chuyển khoản QR' },
            ]}
          />
          {tab === 'cash' ? (
            <>
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
            </>
          ) : qrPayment?.qrCode ? (
            <View style={styles.qrArea}>
              <View style={styles.qrFrame}><QRCode value={qrPayment.qrCode} size={210} /></View>
              <Txt variant="caption" muted>Đang chờ PayOS xác nhận thanh toán…</Txt>
            </View>
          ) : (
            <Btn label="Tạo mã QR" icon="qr" block loading={submitting} onPress={() => void showQr()} />
          )}
          {!qrPayment ? (
            <Btn label="Quay lại sửa đơn" variant="plain" disabled={submitting} onPress={() => void dismiss()} />
          ) : null}
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
  qrArea: { alignItems: 'center', gap: 10 },
  qrFrame: { padding: 12, borderRadius: 8, backgroundColor: '#FFF' },
  success: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  callNumber: { fontFamily: fontFamily.black, fontSize: 64, lineHeight: 72 },
});
