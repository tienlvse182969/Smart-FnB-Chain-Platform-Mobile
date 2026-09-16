import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Txt } from './ui/txt';

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

  return (
    <AppModal
      visible={visible}
      title="Mã QR thanh toán"
      onClose={onDismiss}
      maxWidth={320}
      actions={[{ text: 'Đóng', onPress: onDismiss }]}>
      <View style={styles.wrap}>
        {value ? <QRCode value={value} size={200} /> : null}
        <Txt variant="caption" muted style={styles.code}>
          Mã hoá đơn: {value}
        </Txt>
        <Txt variant="caption" muted style={{ color: theme.color_text_caption }}>
          Đưa tablet cho khách quét mã để chuyển khoản.
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingVertical: 4 },
  code: { fontVariant: ['tabular-nums'] },
});
