import { Toast } from '@ant-design/react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import { useStore } from '@/src/data/store';
import { useNow } from '@/src/data/use-now';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Icon } from '../ui/icon';
import { Segmented } from '../ui/segmented';
import { Txt } from '../ui/txt';
import { ReceiptPreview } from './receipt-preview';

type Tab = 'cash' | 'qr';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Thu tiền một đơn đã chốt (CS-02, CS-03). Trước khi trả tiền, đóng hộp thoại là huỷ đơn cũ để
 * thu ngân sửa lại giỏ (mục 6.5) — huỷ luôn cả QR nếu đang hiện (BR-30).
 */
export function CheckoutDialog({
  orderId,
  onClose,
}: {
  orderId: string | null;
  /** `paid` = true khi đơn đã thanh toán xong → POS xoá giỏ; false → POS giữ giỏ để sửa */
  onClose: (paid: boolean) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { orderById, payCash, startQr, confirmQrPaid, switchToCash, cancelOrder, reprint, state } =
    useStore();
  const order = orderId ? orderById(orderId) : undefined;
  const now = useNow(1000);

  const [tab, setTab] = useState<Tab>('cash');
  const printed = useRef<string | null>(null);

  // mỗi đơn mới mở lại từ tab tiền mặt
  useEffect(() => {
    setTab('cash');
    printed.current = null;
  }, [orderId]);

  const paid =
    !!order && ['Đã thanh toán', 'Đang pha', 'Sẵn sàng', 'Hoàn tất'].includes(order.status);
  const cancelled = !!order && order.status === 'Đã huỷ';

  // "in" bill và phiếu số ngay khi thanh toán xong (BR-21) — bản mô phỏng chỉ báo, chưa in thật.
  // In lỗi thì không toast thành công; khung cảnh báo + nút In lại hiện trong hộp thoại.
  useEffect(() => {
    if (!order || !paid || printed.current === order.id) return;
    printed.current = order.id;
    // mask=false để toast không chặn thu ngân bấm "Đơn mới"
    if (order.printStatus !== 'In thất bại') {
      Toast.success(t('checkout.printed'), 1.5, undefined, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, order?.id]);

  if (!order) return null;

  const qr = order.payment?.method === 'Chuyển khoản QR' ? order.payment : undefined;
  const remaining = qr?.qrExpiresAt ? new Date(qr.qrExpiresAt).getTime() - now : 0;

  const chooseTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    if (next === 'qr' && !qr) startQr(order.id);
    // BR-30: đổi sang tiền mặt thì huỷ QR trước
    if (next === 'cash' && qr) switchToCash(order.id);
  };

  const dismiss = () => {
    if (!paid && !cancelled) cancelOrder(order.id, 'Thu ngân quay lại sửa đơn');
    onClose(paid);
  };

  const title = paid
    ? t('checkout.paidTitle')
    : t('checkout.title', { code: order.orderCode });

  return (
    <AppModal
      visible
      title={title}
      icon={paid ? 'done' : undefined}
      onClose={dismiss}
      maxWidth={520}
      actions={
        paid
          ? [{ text: t('checkout.newOrder'), onPress: dismiss, primary: true }]
          : cancelled
            ? [{ text: t('common.close'), onPress: dismiss, primary: true }]
            : undefined
      }>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {paid ? (
          <>
            <View style={styles.callBox}>
              <Txt variant="caption" muted>
                {t('checkout.callNumber')}
              </Txt>
              <Txt style={styles.callNumber}>{String(order.callNumber ?? 0).padStart(3, '0')}</Txt>
            </View>
            {order.printStatus === 'In thất bại' ? (
              <View style={[styles.printAlert, { borderColor: '#C0392B', backgroundColor: '#FBDBD8' }]}>
                <Icon name="print" size={20} color="#C0392B" />
                <View style={styles.printAlertText}>
                  <Txt variant="bodyStrong" color="#C0392B">
                    {t('checkout.printFailedTitle')}
                  </Txt>
                  <Txt variant="caption">{t('checkout.printFailedHint')}</Txt>
                </View>
                <Btn
                  label={t('checkout.reprint')}
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    reprint(order.id);
                    // in lại vẫn lỗi nếu máy in còn offline (BR-21)
                    if (state.printerOffline) {
                      Toast.fail(t('orders.printFailedToast'), 1.5, undefined, false);
                    } else {
                      Toast.success(t('checkout.printed'), 1.5, undefined, false);
                    }
                  }}
                />
              </View>
            ) : null}
            <ReceiptPreview order={order} />
          </>
        ) : cancelled ? (
          <Txt variant="body" style={styles.center}>
            {order.cancelledReason === 'QR hết hạn' ? t('checkout.expired') : t('checkout.cancelled')}
          </Txt>
        ) : (
          <>
            <View style={styles.totalBox}>
              <Txt variant="caption" muted>
                {t('checkout.totalLabel')}
              </Txt>
              <Txt style={styles.total}>{formatVnd(order.total)}</Txt>
            </View>

            <Segmented<Tab>
              value={tab}
              onChange={chooseTab}
              options={[
                { value: 'cash', label: t('checkout.tabCash') },
                { value: 'qr', label: t('checkout.tabQr') },
              ]}
            />

            {tab === 'cash' ? (
              <View style={styles.section}>
                <Btn
                  label={t('checkout.confirmCash')}
                  icon="cash"
                  block
                  onPress={() => payCash(order.id)}
                />
              </View>
            ) : (
              <View style={styles.section}>
                {qr?.qrCode ? (
                  <View style={styles.qrWrap}>
                    <View style={[styles.qrFrame, { borderColor: theme.border_color_thin }]}>
                      <QRCode value={qr.qrCode} size={200} />
                    </View>
                    <View style={styles.countdownRow}>
                      <Icon name="timer" size={16} color={theme.color_text_caption} />
                      <Txt variant="bodyStrong">{t('checkout.countdown', { time: mmss(remaining) })}</Txt>
                    </View>
                    <Txt variant="caption" muted style={styles.center}>
                      {t('checkout.qrHint')}
                    </Txt>
                  </View>
                ) : (
                  <Btn label={t('checkout.startQr')} icon="qr" block onPress={() => startQr(order.id)} />
                )}
                {qr ? (
                  <>
                    <View style={styles.qrActions}>
                      <Btn
                        label={t('checkout.recheck')}
                        icon="refresh"
                        variant="ghost"
                        onPress={() => Toast.info(t('checkout.recheckNone'), 2.5)}
                      />
                      <Btn
                        label={t('checkout.switchCash')}
                        icon="cash"
                        variant="ghost"
                        onPress={() => chooseTab('cash')}
                      />
                    </View>
                    {/* mô phỏng webhook PayOS — bản có backend sẽ do server đẩy xuống qua Socket.IO */}
                    <Btn
                      label={t('checkout.simulatePaid')}
                      variant="plain"
                      onPress={() => confirmQrPaid(order.id)}
                    />
                  </>
                ) : null}
              </View>
            )}

            <Btn
              label={qr ? t('checkout.editOrder') : t('checkout.backToEdit')}
              variant="plain"
              onPress={dismiss}
            />
          </>
        )}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 620 },
  body: { gap: 14 },
  center: { textAlign: 'center' },
  totalBox: { alignItems: 'center', gap: 2 },
  total: { fontFamily: fontFamily.black, fontSize: 36, lineHeight: 44 },
  section: { gap: 12 },
  qrWrap: { alignItems: 'center', gap: 10 },
  qrFrame: { borderWidth: 1, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  printAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 6,
    padding: 10,
  },
  printAlertText: { flex: 1, gap: 2 },
  callBox: { alignItems: 'center', gap: 2 },
  callNumber: { fontFamily: fontFamily.black, fontSize: 64, lineHeight: 72 },
});
