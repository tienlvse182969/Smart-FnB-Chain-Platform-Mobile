import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon, type IconName } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { shiftInfo } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { StaffRole } from '@/src/data/types';
import { staffRoleKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

const ROLES: { value: StaffRole; icon: IconName }[] = [
  { value: 'Phục vụ', icon: 'guestArrived' },
  { value: 'Bếp', icon: 'chefHat' },
];

export default function LoginScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { checkIn } = useStore();

  const [email, setEmail] = useState('tien@smartfnb.vn');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<StaffRole>('Phục vụ');

  const submit = () => {
    checkIn(role);
    if (role === 'Bếp') {
      router.replace('/(kitchen)/queue');
    } else {
      router.replace('/(waiter)/floor');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
          ]}>
          <View style={styles.brand}>
            <Image
              source={require('@/assets/logo/logo1.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Txt variant="body" muted style={styles.subtitle}>
            {t('login.checkinSubtitle', { branch: shiftInfo.branch })}
          </Txt>

          <View>
            <Txt variant="label" muted style={styles.fieldLabel}>
              {t('login.roleLabel')}
            </Txt>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={[
                      styles.roleCard,
                      {
                        borderColor: active ? theme.brand_primary : theme.border_color_base,
                        backgroundColor: active ? theme.brand_primary : 'transparent',
                      },
                    ]}>
                    <Icon
                      name={r.icon}
                      size={22}
                      color={active ? theme.color_text_base_inverse : theme.color_text_base}
                    />
                    <Txt
                      variant="bodyStrong"
                      color={active ? theme.color_text_base_inverse : theme.color_text_base}>
                      {t(staffRoleKey[r.value])}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field
            label={t('login.emailLabel')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            left={<Icon name="user" size={16} color={theme.color_text_caption} />}
          />
          <Field
            label={t('login.pinLabel')}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            left={<Icon name="lock" size={16} color={theme.color_text_caption} />}
          />

          <Btn
            label={t('login.submit', { role: t(staffRoleKey[role]) })}
            icon="login"
            block
            onPress={submit}
            style={styles.cta}
          />
          <Txt variant="tiny" muted style={styles.hint}>
            {t('login.hint')}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  brandLogo: { width: 220, height: 89 },
  subtitle: { textAlign: 'center', marginBottom: 4 },
  fieldLabel: { marginBottom: 6 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 14,
  },
  cta: { marginTop: 8 },
  hint: { textAlign: 'center' },
});
