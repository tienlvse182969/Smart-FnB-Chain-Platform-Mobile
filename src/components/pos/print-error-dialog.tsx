import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { PrintFailure, PrinterErrorKind } from '@/src/services/printer/bluetooth-printer';
import { AppModal } from '../ui/app-modal';
import { Txt } from '../ui/txt';

/** Gợi ý xử lý theo từng nhóm lỗi; khoá i18n `printer.error.<kind>.{title,tips}`. */
const TIP_COUNT: Record<PrinterErrorKind, number> = {
  NOT_CONFIGURED: 1,
  UNSUPPORTED: 1,
  NO_PERMISSION: 1,
  BLUETOOTH_OFF: 1,
  CONNECTION: 4,
  UNKNOWN: 3,
};

/**
 * Báo thu ngân khi lệnh in ném ngoại lệ (chưa chọn/không kết nối được máy in, Bluetooth tắt, máy in lỗi…).
 * Bluetooth ESC/POS không phản hồi tình trạng giấy, nên hết/kẹt giấy chỉ biết được khi kết nối hoặc ghi dữ liệu thất bại.
 */
export function PrintErrorDialog({
  failure,
  orderPaid,
  onRetry,
  onClose,
}: {
  failure: PrintFailure | null;
  /** Đơn vừa thanh toán xong: nhắc rằng tiền đã ghi nhận và in lại được sau (BR-21). */
  orderPaid?: boolean;
  onRetry?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!failure) return null;

  const { kind, message } = failure;
  const tips = Array.from({ length: TIP_COUNT[kind] }, (_, index) => t(`printer.error.${kind}.tips.${index}`));

  return (
    <AppModal
      visible
      icon="print"
      title={t(`printer.error.${kind}.title`)}
      onClose={onClose}
      maxWidth={460}
      actions={[
        { text: t('common.close'), onPress: onClose },
        ...(onRetry ? [{ text: t('printer.error.retry'), onPress: onRetry, primary: true }] : []),
      ]}>
      {kind === 'UNKNOWN' && message ? (
        <Txt variant="caption" style={styles.detail}>
          {message}
        </Txt>
      ) : null}
      <View style={styles.tips}>
        {tips.map((tip) => (
          <Txt key={tip} variant="body">
            • {tip}
          </Txt>
        ))}
      </View>
      {orderPaid ? (
        <Txt variant="caption" muted>
          {t('printer.error.orderPaid')}
        </Txt>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  detail: { textAlign: 'center' },
  tips: { gap: 6 },
});
