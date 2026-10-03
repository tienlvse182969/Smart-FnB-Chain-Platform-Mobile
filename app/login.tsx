import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { forgetAccount, loadRecentAccounts, rememberAccount, type RecentAccount } from '@/src/auth/recent-accounts';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import { ApiError } from '@/src/services/auth-types';
import { useAppTheme } from '@/src/theme/use-theme';

const AVATAR_COLORS = ['#1677ff', '#52a41a', '#fa8c16', '#eb2f96', '#722ed1', '#13a8a8'];

const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
};

const colorOf = (email: string) => {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

function Avatar({ account, size }: { account: RecentAccount; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorOf(account.email) }]}>
      <Txt variant="title" color="#ffffff" style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>{initialsOf(account.name)}</Txt>
    </View>
  );
}

export default function LoginScreen() {
  const theme = useAppTheme();
  const { login } = useAuth();
  const { checkIn } = useStore();
  const [accounts, setAccounts] = useState<RecentAccount[]>([]);
  const [selected, setSelected] = useState<RecentAccount | null>(null);
  // 'pick': chọn avatar — 'manual': nhập email + mật khẩu
  const [mode, setMode] = useState<'pick' | 'manual'>('manual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadRecentAccounts().then((saved) => {
      if (!active || !saved.length) return;
      setAccounts(saved);
      setMode('pick');
    });
    return () => {
      active = false;
    };
  }, []);

  const choose = (account: RecentAccount) => {
    setSelected(account);
    setPassword('');
    setError(null);
  };

  const showPicker = () => {
    setSelected(null);
    setPassword('');
    setError(null);
    setMode('pick');
  };

  const showManual = () => {
    setSelected(null);
    setEmail('');
    setPassword('');
    setError(null);
    setMode('manual');
  };

  const remove = async (account: RecentAccount) => {
    const next = await forgetAccount(account.email);
    setAccounts(next);
    if (!next.length) setMode('manual');
  };

  const submit = async () => {
    const loginEmail = selected?.email ?? email;
    if (!loginEmail.trim() || !password) return setError(selected ? 'Vui lòng nhập mật khẩu' : 'Vui lòng nhập email và mật khẩu');
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(loginEmail, password);
      const name = user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`.trim() || user.email
        : user.email;
      await rememberAccount({ email: user.email, name, role: user.role });
      if (user.role === 'CASHIER') {
        checkIn('Thu ngân', { id: user.id, name });
        router.replace('/select-station');
      } else {
        checkIn('Pha chế', { id: user.id, name });
        router.replace('/(barista)/queue');
      }
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? (selected ? 'Mật khẩu không đúng' : 'Email hoặc mật khẩu không đúng') : reason instanceof Error ? reason.message : 'Không thể đăng nhập');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (role: RecentAccount['role']) => (role === 'CASHIER' ? 'Thu ngân' : 'Pha chế');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
            <Image source={require('@/assets/logo/logo1.png')} style={styles.logo} resizeMode="contain" />
            <Txt variant="title" style={styles.title}>Đăng nhập nhân viên</Txt>

            {mode === 'pick' && !selected ? (
              <>
                <Txt variant="body" muted style={styles.subtitle}>Chọn tài khoản để đăng nhập</Txt>
                <View style={styles.accounts}>
                  {accounts.map((account) => (
                    <View key={account.email} style={styles.accountWrap}>
                      <Pressable accessibilityRole="button" accessibilityLabel={account.name} onPress={() => choose(account)} style={styles.account}>
                        <Avatar account={account} size={64} />
                        <Txt variant="bodyStrong" numberOfLines={1} style={styles.accountName}>{account.name}</Txt>
                        <Txt variant="caption" muted>{roleLabel(account.role)}</Txt>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Xoá ${account.name} khỏi danh sách`}
                        hitSlop={8}
                        onPress={() => void remove(account)}
                        style={[styles.removeBadge, { backgroundColor: theme.fill_body, borderColor: theme.border_color_base }]}>
                        <Icon name="close" size={12} color={theme.color_text_caption} />
                      </Pressable>
                    </View>
                  ))}
                </View>
                <Btn label="Dùng tài khoản khác" icon="user" variant="ghost" block onPress={showManual} />
              </>
            ) : selected ? (
              <>
                <View style={styles.selected}>
                  <Avatar account={selected} size={72} />
                  <Txt variant="bodyStrong">{selected.name}</Txt>
                  <Txt variant="caption" muted>{selected.email} · {roleLabel(selected.role)}</Txt>
                </View>
                <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoFocus left={<Icon name="lock" size={17} color={theme.color_text_caption} />} />
                {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
                <Btn label="Đăng nhập" icon="login" block loading={submitting} onPress={submit} />
                <Btn label="Chọn tài khoản khác" variant="plain" block onPress={showPicker} />
              </>
            ) : (
              <>
                <Txt variant="body" muted style={styles.subtitle}>Dành cho Thu ngân và Pha chế</Txt>
                <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" left={<Icon name="user" size={17} color={theme.color_text_caption} />} />
                <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry left={<Icon name="lock" size={17} color={theme.color_text_caption} />} />
                {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
                <Btn label="Đăng nhập" icon="login" block loading={submitting} onPress={submit} />
                {accounts.length ? <Btn label="Chọn từ tài khoản đã đăng nhập" variant="plain" block onPress={showPicker} /> : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, padding: 24, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, gap: 16 },
  logo: { width: 220, height: 90, alignSelf: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: -10 },
  accounts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  accountWrap: { width: 120 },
  account: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  accountName: { maxWidth: 112, textAlign: 'center', marginTop: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  removeBadge: { position: 'absolute', top: 4, right: 12, width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selected: { alignItems: 'center', gap: 4 },
});
