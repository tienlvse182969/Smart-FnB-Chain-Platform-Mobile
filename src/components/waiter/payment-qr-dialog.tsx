import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from '../ui/app-modal';
import { Txt } from '../ui/txt';

/** Mã QR thật để khách quét tại bàn — mã hoá đơn duy nhất, không đối soát chỉ bằng số tiền (BR-16). */
export function PaymentQrDialog({
  visible,
  value,
  onDismiss,
}: {
  visible: boolean;
  value: string;
  onDismiss: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <AppModal
      visible={visible}
      title={t('paymentQrDialog.title')}
      onClose={onDismiss}
      maxWidth={320}
      actions={[{ text: t('common.close'), onPress: onDismiss }]}>
      <View style={styles.wrap}>
        {value ? <QRCode value={value} size={200} /> : null}
        <Txt variant="caption" muted style={styles.code}>
          {t('paymentQrDialog.invoiceCode', { code: value })}
        </Txt>
        <Txt variant="caption" muted style={{ color: theme.color_text_caption }}>
          {t('paymentQrDialog.hint')}
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingVertical: 4 },
  code: { fontVariant: ['tabular-nums'] },
});
