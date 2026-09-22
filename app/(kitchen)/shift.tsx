import { Switch } from '@ant-design/react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, durationSince } from '@/src/data/format';
import { categories, shiftInfo, staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { staffRoleKey } from '@/src/i18n/labels';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

export default function KitchenShiftScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state, checkOut, setSimulate, setKitchenStationCategories } = useStore();
  const { logout } = useAuth();
  const selectedCats = state.kitchenStationCategories;

  const toggleCat = (id: string) =>
    setKitchenStationCategories(
      selectedCats.includes(id) ? selectedCats.filter((x) => x !== id) : [...selectedCats, id],
    );

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader
          title={t('shift.title')}
          subtitle={`${state.currentUser?.name ?? staffByRole['Bếp'].name} · ${t(staffRoleKey['Bếp'])}`}
        />

        <View style={cardStyle}>
          <View style={styles.shiftHead}>
            <Icon name="done" size={22} />
            <Txt style={styles.big}>{state.checkedInAt ? t('shift.inShift') : t('shift.notCheckedIn')}</Txt>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
          <Row label={t('shift.branch')} value={shiftInfo.branch} />
          <Row label={t('shift.checkinTime')} value={state.checkedInAt ? clockAt(state.checkedInAt) : '—'} />
          <Row label={t('shift.duration')} value={state.checkedInAt ? durationSince(state.checkedInAt) : '—'} />
          <Txt variant="caption" muted style={styles.checkoutNote}>
            {t('kitchenShift.checkoutNote')}
          </Txt>
          <Btn
            label={t('kitchenShift.checkoutDemo')}
            icon="logout"
            block
            variant="ghost"
            style={styles.checkout}
            onPress={() => {
              logout().catch(() => {});
              checkOut();
              router.replace('/login');
            }}
          />
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          {t('kitchenShift.categoriesTitle')}
        </Txt>
        <View style={cardStyle}>
          <View style={styles.catRow}>
            {categories.map((c) => (
              <Pill key={c.id} label={c.label} selected={selectedCats.includes(c.id)} onPress={() => toggleCat(c.id)} />
            ))}
          </View>
          <Txt variant="caption" muted style={styles.catHint}>
            {t('kitchenShift.categoriesHint')}
          </Txt>
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          {t('shift.settings')}
        </Txt>
        <View style={cardStyle}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Txt variant="body">{t('shift.simulateRealtime')}</Txt>
              <Txt variant="tiny" muted>
                {t('kitchenShift.simulateHint')}
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
  pad: { padding: 20, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, padding: 16, gap: 6, marginBottom: 8 },
  shiftHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  big: { fontFamily: fontFamily.bold, fontSize: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  checkoutNote: { marginTop: 10 },
  checkout: { marginTop: 10 },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catHint: { marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { flex: 1, gap: 2 },
});
