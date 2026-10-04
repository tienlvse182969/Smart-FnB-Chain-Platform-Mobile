import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useCustomerDisplay } from '@/src/stations/customer-display-context';
import { useAppTheme } from '@/src/theme/use-theme';

const DANGER = '#C0392B';

/**
 * Dải trạng thái màn hình phía khách ở khung giỏ hàng (BR-47): luôn cho thu ngân biết màn hình khách
 * có đang nhận giỏ hay không. Chạm vào để mở hộp thoại ghép bằng mã OTP.
 */
export function CustomerDisplayBar() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { link, openPairing } = useCustomerDisplay();

  if (link.status === 'loading') return null;

  const visual: { icon: IconName; status: string; color: string; action?: string } =
    link.status === 'unpaired'
      ? { icon: 'display', status: t('customerDisplay.status.unpaired'), color: theme.color_text_caption, action: t('customerDisplay.pair') }
      : link.status === 'disconnected'
        ? { icon: 'displayOff', status: t('customerDisplay.status.disconnected'), color: DANGER }
        : { icon: 'displayPaired', status: t('customerDisplay.status.connected'), color: theme.color_text_base };

  return (
    <Pressable
      onPress={openPairing}
      accessibilityRole="button"
      accessibilityLabel={`${t('customerDisplay.label')}: ${visual.status}`}
      style={({ pressed }) => [
        styles.bar,
        { borderColor: theme.border_color_thin, backgroundColor: pressed ? theme.fill_tap : theme.fill_body },
      ]}>
      <Icon name={visual.icon} size={16} color={visual.color} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Txt variant="label">{t('customerDisplay.label')}</Txt>
          <Txt variant="label" color={visual.color} numberOfLines={1} style={styles.status}>
            · {visual.status}
          </Txt>
        </View>
        {link.status === 'disconnected' ? (
          <Txt variant="tiny" color={DANGER} numberOfLines={2}>
            {t('customerDisplay.disconnectedHint')}
          </Txt>
        ) : null}
      </View>
      {visual.action ? (
        <Txt variant="label" style={styles.action}>
          {visual.action}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { flexShrink: 1 },
  action: { textDecorationLine: 'underline' },
});
