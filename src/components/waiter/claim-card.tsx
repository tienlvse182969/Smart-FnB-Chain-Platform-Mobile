import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { staffByRole } from '@/src/data/mock';
import { durationSince } from '@/src/data/format';
import { useStore } from '@/src/data/store';
import type { ClaimEntry } from '@/src/data/types';
import { claimEscalationKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from '../ui/button';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

export function ClaimCard({
  entry,
  onClaim,
  onServe,
}: {
  entry: ClaimEntry;
  onClaim: () => void;
  onServe: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state } = useStore();
  const mine = entry.claimedBy === (state.currentUser?.name ?? staffByRole['Phục vụ'].name);
  const byOther = !!entry.claimedBy && !mine;
  const urgent = entry.escalation !== 'thường';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.fill_base,
          borderColor: urgent ? theme.color_text_base : theme.border_color_thin,
          borderWidth: urgent ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={[styles.tableTag, { backgroundColor: theme.brand_primary }]}>
        <Txt variant="title" color={theme.color_text_base_inverse}>
          {entry.tableName}
        </Txt>
      </View>

      <View style={styles.info}>
        <Txt variant="bodyStrong">
          {entry.name} ×{entry.qty}
        </Txt>
        <View style={styles.metaRow}>
          <Icon name="pin" size={12} color={theme.color_text_caption} />
          <Txt variant="label" muted>
            {entry.categoryLabel} · {t('claimCard.waitingLabel', { duration: durationSince(entry.waitingSince) })}
          </Txt>
          {entry.escalation === 'khẩn' ? (
            <Txt variant="tiny" style={[styles.tag, { borderColor: theme.color_text_base }]}>
              {t(claimEscalationKey.khẩn)}
            </Txt>
          ) : null}
          {entry.escalation === 'manager' ? (
            <Txt variant="tiny" style={[styles.tag, { borderColor: theme.color_text_base }]}>
              {t(claimEscalationKey.manager)}
            </Txt>
          ) : null}
        </View>
      </View>

      {mine ? (
        <Btn label={t('claimCard.servedBtn')} icon="served" size="sm" onPress={onServe} />
      ) : byOther ? (
        <View style={styles.lockRow}>
          <Icon name="user" size={13} color={theme.color_text_caption} />
          <Txt variant="label" muted>
            {t('claimCard.carryingBy', { name: entry.claimedBy })}
          </Txt>
        </View>
      ) : (
        <Btn label={t('claimCard.claimBtn')} icon="guestArrived" size="sm" variant="ghost" onPress={onClaim} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 2,
  },
  tableTag: {
    minWidth: 52,
    height: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  tag: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
