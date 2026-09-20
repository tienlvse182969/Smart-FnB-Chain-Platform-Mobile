import { type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Modal } from '@ant-design/react-native';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from './button';
import { Icon, type IconName } from './icon';
import { Txt } from './txt';

type ModalAction = { text: string; onPress: () => void; primary?: boolean; disabled?: boolean };

/** Modal dựng trên antd `Modal` (transparent) — khung/nội dung tự vẽ để giữ đúng theme B&W. */
export function AppModal({
  visible,
  title,
  icon,
  onClose,
  children,
  actions,
  maxWidth = 460,
}: {
  visible: boolean;
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  actions?: ModalAction[];
  maxWidth?: number;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const dialogWidth = Math.min(maxWidth, width - 48);

  return (
    <Modal
      visible={visible}
      transparent
      maskClosable
      closable={false}
      animationType="fade"
      onClose={onClose}
      onRequestClose={() => {
        onClose();
        return true;
      }}
      style={{
        width: dialogWidth,
        backgroundColor: theme.fill_base,
        borderColor: theme.border_color_thin,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 16,
        paddingTop: 20,
      }}
      bodyStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 0 }}>
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={32} />
        </View>
      ) : null}
      <Txt variant="h2" style={styles.title}>
        {title}
      </Txt>
      <View style={styles.content}>{children}</View>
      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Btn
              key={a.text}
              label={a.text}
              onPress={a.onPress}
              disabled={a.disabled}
              variant={a.primary ? 'primary' : 'ghost'}
            />
          ))}
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', marginBottom: 10 },
  title: { marginBottom: 12, textAlign: 'center', fontFamily: fontFamily.semibold },
  content: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
});
