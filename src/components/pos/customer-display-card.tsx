import { Switch } from '@ant-design/react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { isPairingMock } from '@/src/services/display-pairing-api';
import { useCustomerDisplay } from '@/src/stations/customer-display-context';
import { useAppTheme } from '@/src/theme/use-theme';

const DANGER = '#C0392B';

/** Mục "Màn hình phía khách" trong Tài khoản của thu ngân: trạng thái ghép của quầy + nút ghép. */
export function CustomerDisplayCard() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { station, link, openPairing, simulateDisconnected, setSimulateDisconnected } = useCustomerDisplay();

  const paired = link.status === 'connected' || link.status === 'disconnected';
  const pairedAt = paired
    ? new Date(link.display.pairedAt).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : null;

  return (
    <>
      <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
        {t('customerDisplay.section')}
      </Txt>
      <View style={[styles.card, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
        <View style={styles.row}>
          <Icon
            name={link.status === 'connected' ? 'displayPaired' : link.status === 'disconnected' ? 'displayOff' : 'display'}
            size={18}
            color={link.status === 'disconnected' ? DANGER : theme.color_text_base}
          />
          <View style={styles.text}>
            <Txt variant="body">{station?.name}</Txt>
            <Txt variant="tiny" muted={link.status !== 'disconnected'} color={link.status === 'disconnected' ? DANGER : undefined}>
              {link.status === 'loading'
                ? t('customerDisplay.status.loading')
                : link.status === 'unpaired'
                  ? t('customerDisplay.status.unpairedLong')
                  : `${t(`customerDisplay.status.${link.status}`)} · ${t('customerDisplay.pairedAt', { time: pairedAt })}`}
            </Txt>
          </View>
        </View>

        <Btn
          label={paired ? t('customerDisplay.pairAnother') : t('customerDisplay.pairCta')}
          icon="display"
          variant={paired ? 'ghost' : 'primary'}
          block
          disabled={link.status === 'loading'}
          onPress={openPairing}
          style={styles.button}
        />
        {paired ? (
          <Txt variant="tiny" muted>
            {t('customerDisplay.replaceNote')}
          </Txt>
        ) : null}

        {paired && isPairingMock ? (
          <View style={[styles.row, styles.simulate, { borderTopColor: theme.border_color_thin }]}>
            <View style={styles.text}>
              <Txt variant="body">{t('customerDisplay.simulateDisconnect')}</Txt>
              <Txt variant="tiny" muted>
                {t('customerDisplay.simulateDisconnectHint')}
              </Txt>
            </View>
            <Switch checked={simulateDisconnected} onChange={setSimulateDisconnected} />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 16, gap: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, gap: 2 },
  button: { marginTop: 10 },
  simulate: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 12 },
});
