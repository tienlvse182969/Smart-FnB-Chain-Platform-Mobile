import { Modal } from '@ant-design/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from './button';
import { Txt } from './txt';

type ModalAction = { text: string; onPress: () => void; primary?: boolean; disabled?: boolean };

/** Modal nội dung tuỳ biến — khung nhất quán, override width cố định 286 của antd. */
export function AppModal({
  visible,
  title,
  onClose,
  children,
  actions,
  maxWidth = 460,
}: {
  visible: boolean;
  title: string;
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
      transparent
      visible={visible}
      maskClosable
      animationType="fade"
      onClose={onClose}
      style={[
        styles.container,
        { width: dialogWidth, borderColor: theme.border_color_thin },
      ]}
      bodyStyle={styles.body}>
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
  container: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingTop: 20 },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { marginBottom: 12 },
  content: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
});
