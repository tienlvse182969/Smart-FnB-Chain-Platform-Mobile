import { Switch } from '@ant-design/react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  setNewOrderSoundEnabled,
  useNewOrderSoundEnabled,
  useNewOrderSoundPlayer,
} from '@/src/services/new-order-sound';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

/** Dòng cài đặt ở màn hình Tài khoản của pha chế: bật/tắt âm báo món mới. Bật lên thì phát thử một lần. */
export function NewOrderSoundSetting() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const enabled = useNewOrderSoundEnabled();
  const play = useNewOrderSoundPlayer();

  return (
    <View style={styles.row}>
      <Icon name={enabled ? 'bell' : 'bellOff'} size={18} color={theme.color_text_caption} />
      <View style={styles.text}>
        <Txt variant="body">{t('account.newOrderSound.label')}</Txt>
        <Txt variant="tiny" muted>
          {t('account.newOrderSound.description')}
        </Txt>
      </View>
      <Switch
        checked={enabled}
        onChange={(value) => {
          setNewOrderSoundEnabled(value);
          if (value) play();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, gap: 2 },
});
