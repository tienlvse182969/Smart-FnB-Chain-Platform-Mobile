import { Switch } from '@ant-design/react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, durationSince } from '@/src/data/format';
import { shiftInfo, staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { staffRoleKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

export default function ShiftScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state, checkOut, setSimulate } = useStore();

  const myTables = state.tables.filter((t) => t.status === 'Đang phục vụ');
  const sessionOf = (tableId: string) =>
    state.sessions.find((s) => s.tableIds.includes(tableId) && s.status === 'Đang hoạt động');

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader
          title={t('shift.title')}
          subtitle={`${staffByRole['Phục vụ'].name} · ${t(staffRoleKey['Phục vụ'])}`}
        />

        <View style={cardStyle}>
          <View style={styles.shiftHead}>
            <Icon name="done" size={20} />
            <Txt variant="title">{state.checkedInAt ? t('shift.inShift') : t('shift.notCheckedIn')}</Txt>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
          <Row label={t('shift.branch')} value={shiftInfo.branch} />
          <Row label={t('waiterShift.zone')} value={shiftInfo.zone} />
          <Row label={t('shift.checkinTime')} value={state.checkedInAt ? clockAt(state.checkedInAt) : '—'} />
          <Row label={t('shift.duration')} value={state.checkedInAt ? durationSince(state.checkedInAt) : '—'} />
          <Row label={t('waiterShift.activeSessions')} value={t('waiterShift.tableCount', { count: myTables.length })} />
          <Btn
            label={t('shift.checkout')}
            icon="logout"
            block
            style={styles.checkout}
            onPress={() => {
              checkOut();
              router.replace('/login');
            }}
          />
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          {t('waiterShift.assignedTables')}
        </Txt>
        <View style={[...cardStyle, styles.cardTight]}>
          {myTables.length === 0 ? (
            <Txt variant="body" muted style={styles.rowPad}>
              {t('waiterShift.noTables')}
            </Txt>
          ) : null}
          {myTables.map((tb, i) => {
            const s = sessionOf(tb.id);
            return (
              <Pressable
                key={tb.id}
                onPress={() =>
                  router.push({ pathname: '/(waiter)/table/[id]', params: { id: tb.id } })
                }
                style={({ pressed }) => [
                  styles.tableRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border_color_thin,
                  },
                  pressed && { backgroundColor: theme.fill_tap },
                ]}>
                <Icon name="chair" size={18} color={theme.color_text_caption} />
                <View style={styles.tableRowText}>
                  <Txt variant="bodyStrong">
                    {tb.name} · {tb.area}
                  </Txt>
                  {s ? (
                    <Txt variant="caption" muted>
                      {t('waiterShift.sessionMeta', {
                        guests: s.guests,
                        orders: s.orders.length,
                        duration: durationSince(s.openedAt),
                      })}
                    </Txt>
                  ) : null}
                </View>
                <Icon name="chevronDown" size={16} color={theme.color_text_caption} />
              </Pressable>
            );
          })}
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          {t('shift.settings')}
        </Txt>
        <View style={cardStyle}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Txt variant="body">{t('shift.simulateRealtime')}</Txt>
              <Txt variant="tiny" muted>
                {t('waiterShift.simulateHint')}
              </Txt>
            </View>
            <Switch checked={state.simulate} onChange={setSimulate} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt variant="body" muted>
        {label}
      </Txt>
      <Txt variant="body">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: 16, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 16, gap: 6, marginBottom: 8 },
  cardTight: { padding: 0, paddingVertical: 4 },
  shiftHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  checkout: { marginTop: 14 },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  rowPad: { padding: 14 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  tableRowText: { flex: 1, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { flex: 1, gap: 2 },
});
