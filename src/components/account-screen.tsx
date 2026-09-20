import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Icon } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { Txt } from '@/src/components/ui/txt';
import { staffByRole } from '@/src/data/mock';
import type { StaffRole } from '@/src/data/types';
import { setAppLanguage, type AppLanguage } from '@/src/i18n';
import { staffRoleKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

/** Màn hình tài khoản dùng chung cho mọi actor — mở khi bấm avatar ở NavRail. */
export function AccountScreen({ role }: { role: StaffRole }) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const staff = staffByRole[role];

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title={t('account.screenTitle')} />

        <View style={[...cardStyle, styles.profileCard]}>
          <View
            style={[
              styles.avatar,
              { borderColor: theme.border_color_base, backgroundColor: theme.fill_body },
            ]}>
            <Txt variant="title">{initials(staff.name)}</Txt>
          </View>
          <Txt variant="h1" numberOfLines={1} style={styles.profileName}>
            {staff.name}
          </Txt>
          <Txt variant="body" muted>
            {t(staffRoleKey[role])} · {staff.branch}
          </Txt>
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          {t('account.settingsSection')}
        </Txt>
        <View style={cardStyle}>
          <View style={styles.settingRow}>
            <Icon name="language" size={18} color={theme.color_text_caption} />
            <View style={styles.settingText}>
              <Txt variant="body">{t('account.language.label')}</Txt>
              <Txt variant="tiny" muted>
                {t('account.language.description')}
              </Txt>
            </View>
          </View>
          <Segmented<AppLanguage>
            value={i18n.language as AppLanguage}
            options={[
              { value: 'vi', label: t('account.language.vi') },
              { value: 'en', label: t('account.language.en') },
            ]}
            onChange={setAppLanguage}
            style={styles.languageSegmented}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: 16, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 16, gap: 6, marginBottom: 8 },
  profileCard: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileName: { textAlign: 'center' },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { flex: 1, gap: 2 },
  languageSegmented: { marginTop: 12 },
});
