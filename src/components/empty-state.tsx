import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';
import { Icon, type IconName } from './ui/icon';
import { Txt } from './ui/txt';

export function EmptyState({
  icon = 'receipt',
  title,
  hint,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={44} color={theme.color_text_caption} strokeWidth={1.6} />
      <Txt variant="title" style={styles.title}>
        {title}
      </Txt>
      {hint ? (
        <Txt variant="body" muted style={styles.hint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  title: { marginTop: 8 },
  hint: { textAlign: 'center' },
});
