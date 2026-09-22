import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  authUserDisplayName,
  staffRoleForAppRole,
  UnsupportedRoleError,
  useAuth,
} from '@/src/auth/auth-context';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { shiftInfo } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { ApiError } from '@/src/services/auth-types';
import type { RememberedAccount } from '@/src/services/remembered-accounts';
import { useAppTheme } from '@/src/theme/use-theme';

const initials = (name: string) =>
  name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

type LoginView = 'accounts' | 'password' | 'form';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { checkIn } = useStore();
  const { rememberedAccounts, login, forgetAccount } = useAuth();

  const [showFullForm, setShowFullForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountToForget, setAccountToForget] = useState<RememberedAccount | null>(null);

  const hasRemembered = rememberedAccounts.length > 0;
  const view: LoginView = selectedAccount ? 'password' : hasRemembered && !showFullForm ? 'accounts' : 'form';

  const clearError = () => setErrorMessage(null);

  const selectAccount = (account: RememberedAccount) => {
    clearError();
    setPassword('');
    setSelectedAccount(account);
  };

  const backToAccounts = () => {
    clearError();
    setSelectedAccount(null);
    setShowFullForm(false);
  };

  const goToFullForm = () => {
    clearError();
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setShowFullForm(true);
  };

  const loginErrorMessage = (err: unknown): string => {
    if (err instanceof UnsupportedRoleError) return t('login.errors.unsupportedRole');
    if (err instanceof ApiError) {
      if (err.status === 401) return t('login.errors.invalidCredentials');
      if (err.status === 403) return t('login.errors.inactiveAccount');
      if (err.status === 400) return t('login.errors.invalidCredentials');
    }
    return t('login.errors.network');
  };

  const submit = async () => {
    const targetEmail = selectedAccount ? selectedAccount.email : email.trim();
    if (!targetEmail || !password) {
      setErrorMessage(t('login.errors.invalidCredentials'));
      return;
    }
    clearError();
    setSubmitting(true);
    try {
      const user = await login(targetEmail, password);
      const staffRole = staffRoleForAppRole(user.role);
      if (!staffRole) {
        setErrorMessage(t('login.errors.unsupportedRole'));
        return;
      }
      checkIn(staffRole, { id: user.id, name: authUserDisplayName(user), email: user.email });
      if (staffRole === 'Bếp') {
        router.replace('/(kitchen)/queue');
      } else {
        router.replace('/(waiter)/floor');
      }
    } catch (err) {
      setErrorMessage(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmForget = async () => {
    if (!accountToForget) return;
    await forgetAccount(accountToForget.id);
    if (selectedAccount?.id === accountToForget.id) setSelectedAccount(null);
    setAccountToForget(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.center}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

            {view === 'accounts' ? (
              <View>
                <Txt variant="label" muted style={styles.fieldLabel}>
                  {t('login.chooseAccount')}
                </Txt>
                <View style={styles.accountsRow}>
                  {rememberedAccounts.map((acc) => (
                    <Pressable
                      key={acc.id}
                      onPress={() => selectAccount(acc)}
                      onLongPress={() => setAccountToForget(acc)}
                      style={styles.accountItem}>
                      <View
                        style={[
                          styles.avatar,
                          { borderColor: theme.border_color_base, backgroundColor: theme.fill_body },
                        ]}>
                        <Txt variant="bodyStrong">{initials(acc.displayName)}</Txt>
                      </View>
                      <Txt variant="tiny" numberOfLines={1} style={styles.accountName}>
                        {acc.displayName}
                      </Txt>
                    </Pressable>
                  ))}
                  <Pressable onPress={goToFullForm} style={styles.accountItem}>
                    <View style={[styles.avatar, styles.avatarAdd, { borderColor: theme.border_color_base }]}>
                      <Icon name="plus" size={20} color={theme.color_text_caption} />
                    </View>
                    <Txt variant="tiny" muted numberOfLines={1} style={styles.accountName}>
                      {t('login.useAnotherAccount')}
                    </Txt>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {view === 'password' && selectedAccount ? (
              <View style={styles.selectedAccountBlock}>
                <View
                  style={[
                    styles.avatar,
                    styles.avatarLarge,
                    { borderColor: theme.border_color_base, backgroundColor: theme.fill_body },
                  ]}>
                  <Txt variant="title">{initials(selectedAccount.displayName)}</Txt>
                </View>
                <Txt variant="bodyStrong" style={styles.selectedName}>
                  {selectedAccount.displayName}
                </Txt>
                <Txt variant="tiny" muted>
                  {selectedAccount.email}
                </Txt>

                <Field
                  label={t('login.passwordLabel')}
                  value={password}
                  onChangeText={(v) => {
                    clearError();
                    setPassword(v);
                  }}
                  secureTextEntry
                  left={<Icon name="lock" size={16} color={theme.color_text_caption} />}
                  containerStyle={styles.passwordField}
                />

                <Pressable onPress={backToAccounts} hitSlop={8}>
                  <Txt variant="tiny" muted style={styles.linkText}>
                    {t('login.notYouChooseAnother')}
                  </Txt>
                </Pressable>
              </View>
            ) : null}

            {view === 'form' ? (
              <View style={styles.formBlock}>
                <Field
                  label={t('login.emailLabel')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(v) => {
                    clearError();
                    setEmail(v);
                  }}
                  left={<Icon name="user" size={16} color={theme.color_text_caption} />}
                />
                <Field
                  label={t('login.passwordLabel')}
                  value={password}
                  onChangeText={(v) => {
                    clearError();
                    setPassword(v);
                  }}
                  secureTextEntry
                  left={<Icon name="lock" size={16} color={theme.color_text_caption} />}
                />
                {hasRemembered ? (
                  <Pressable onPress={backToAccounts} hitSlop={8}>
                    <Txt variant="tiny" muted style={styles.linkText}>
                      {t('login.backToAccounts')}
                    </Txt>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {errorMessage ? (
              <Txt variant="tiny" color={theme.brand_error} style={styles.error}>
                {errorMessage}
              </Txt>
            ) : null}

            <Btn
              label={t('login.submit')}
              icon="login"
              block
              loading={submitting}
              onPress={submit}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppModal
        visible={!!accountToForget}
        title={t('login.forgetAccountConfirmTitle')}
        onClose={() => setAccountToForget(null)}
        actions={[
          { text: t('common.cancel'), onPress: () => setAccountToForget(null) },
          { text: t('login.forgetAccountConfirmButton'), onPress: confirmForget, primary: true },
        ]}>
        <Txt variant="body" muted>
          {t('login.forgetAccountConfirmMessage', { name: accountToForget?.displayName ?? '' })}
        </Txt>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
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
  accountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  accountItem: { alignItems: 'center', width: 72, gap: 6 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdd: { borderStyle: 'dashed' },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center' },
  accountName: { textAlign: 'center' },
  selectedAccountBlock: { alignItems: 'center', gap: 4 },
  selectedName: { marginTop: 4 },
  passwordField: { width: '100%', marginTop: 12 },
  formBlock: { gap: 12 },
  linkText: { textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
  error: { textAlign: 'center' },
  cta: { marginTop: 8 },
});
