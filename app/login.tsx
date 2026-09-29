import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { branchName, staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { StaffRole } from '@/src/data/types';
import { staffRoleKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

const ACCOUNTS: { role: StaffRole; hintKey: string; href: '/(cashier)/pos' | '/(barista)/queue' }[] = [
  { role: 'Thu ngân', hintKey: 'login.cashierHint', href: '/(cashier)/pos' },
  { role: 'Pha chế', hintKey: 'login.baristaHint', href: '/(barista)/queue' },
];

/**
 * Đăng nhập mô phỏng: chưa có backend nên chọn thẳng tài khoản mẫu của từng vai trò. Đăng nhập
 * thật (email + mật khẩu) sẽ gắn lại khi có API mới theo đặc tả v8.1.
 */
export default function LoginScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { checkIn } = useStore();

  const signIn = (role: StaffRole, href: (typeof ACCOUNTS)[number]['href']) => {
    const staff = staffByRole[role];
    checkIn(role, { id: staff.id, name: staff.name });
    router.replace(href);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
          <View style={styles.brand}>
            <Image source={require('@/assets/logo/logo1.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <Txt variant="body" muted style={styles.subtitle}>
            {t('login.subtitle', { branch: branchName })}
          </Txt>

          <Txt variant="label" muted style={styles.fieldLabel}>
            {t('login.chooseAccount')}
          </Txt>
          <View style={styles.accounts}>
            {ACCOUNTS.map(({ role, hintKey, href }) => {
              const staff = staffByRole[role];
              return (
                <Pressable
                  key={role}
                  onPress={() => signIn(role, href)}
                  style={({ pressed }) => [
                    styles.account,
                    { borderColor: theme.border_color_base, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <View style={[styles.avatar, { borderColor: theme.border_color_base, backgroundColor: theme.fill_body }]}>
                    <Txt variant="bodyStrong">{initials(staff.name)}</Txt>
                  </View>
                  <View style={styles.accountText}>
                    <Txt variant="bodyStrong">{staff.name}</Txt>
                    <Txt variant="caption" muted>
                      {t(staffRoleKey[role])} · {t(hintKey)}
                    </Txt>
                  </View>
                  <Icon name="login" size={18} color={theme.color_text_caption} />
                </Pressable>
              );
            })}
          </View>

          <Txt variant="tiny" muted style={styles.note}>
            {t('login.demoNote')}
          </Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 220, height: 89 },
  subtitle: { textAlign: 'center', marginBottom: 4 },
  fieldLabel: { marginTop: 4 },
  accounts: { gap: 10 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { flex: 1, gap: 2 },
  note: { textAlign: 'center', marginTop: 4 },
});
