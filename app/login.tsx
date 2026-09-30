import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import { ApiError } from '@/src/services/auth-types';
import { useAppTheme } from '@/src/theme/use-theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { login } = useAuth();
  const { checkIn } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Vui lòng nhập email và mật khẩu');
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      const name = user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`.trim() || user.email
        : user.email;
      if (user.role === 'CASHIER') {
        checkIn('Thu ngân', { id: user.id, name });
        router.replace('/select-station');
      } else {
        checkIn('Pha chế', { id: user.id, name });
        router.replace('/(barista)/queue');
      }
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? 'Email hoặc mật khẩu không đúng' : reason instanceof Error ? reason.message : 'Không thể đăng nhập');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
            <Image source={require('@/assets/logo/logo1.png')} style={styles.logo} resizeMode="contain" />
            <Txt variant="title" style={styles.title}>Đăng nhập nhân viên</Txt>
            <Txt variant="body" muted style={styles.subtitle}>Dành cho Thu ngân và Pha chế</Txt>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" left={<Icon name="user" size={17} color={theme.color_text_caption} />} />
            <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry left={<Icon name="lock" size={17} color={theme.color_text_caption} />} />
            {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
            <Btn label="Đăng nhập" icon="login" block loading={submitting} onPress={submit} />
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
});
