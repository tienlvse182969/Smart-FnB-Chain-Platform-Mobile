import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from './ui/txt';

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBox}>
        <Txt variant="h1" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="body" muted numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 12,
  },
  titleBox: { flexShrink: 1 },
  subtitle: { marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
});
