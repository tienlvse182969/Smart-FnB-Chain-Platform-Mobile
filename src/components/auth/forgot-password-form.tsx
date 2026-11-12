import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { requestPasswordReset } from '@/src/services/auth-api';
import { ApiError } from '@/src/services/auth-types';
import { useAppTheme } from '@/src/theme/use-theme';

/** BE chỉ gửi 1 email/2 phút cho mỗi tài khoản — khoá nút "Gửi lại" cùng khoảng để tránh bấm vô ích. */
const RESEND_COOLDOWN_SECONDS = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Form "Quên mật khẩu" cho Thu ngân / Pha chế, hiển thị trong thẻ của màn đăng nhập.
 * App chỉ gửi yêu cầu; người dùng đặt mật khẩu mới qua liên kết web trong email rồi quay lại đăng nhập.
 */
export function ForgotPasswordForm({ initialEmail = '', onBack }: { initialEmail?: string; onBack: () => void }) {
  const theme = useAppTheme();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    const value = email.trim();
    if (!value) return setError('Vui lòng nhập email');
    if (!EMAIL_PATTERN.test(value)) return setError('Email không hợp lệ');
    setSubmitting(true);
    setError(null);
    try {
      const { message } = await requestPasswordReset(value);
      setSentMessage(message || 'Nếu email đúng, hướng dẫn đặt lại đã được gửi đi');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 429
          ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'
          : reason instanceof Error
            ? reason.message
            : 'Không thể gửi yêu cầu',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    setSentMessage(null);
    setError(null);
  };

  if (sentMessage) {
    return (
      <>
        <View style={styles.sent}>
          <View style={[styles.sentIcon, { backgroundColor: theme.fill_base, borderColor: theme.border_color_base }]}>
            <Icon name="mail" size={28} color={theme.brand_primary} />
          </View>
          <Txt variant="bodyStrong" style={styles.center}>{sentMessage}</Txt>
          <Txt variant="caption" muted style={styles.center}>{email.trim().toLowerCase()}</Txt>
          <Txt variant="body" muted style={styles.center}>
            Mở email và bấm vào liên kết (hiệu lực 30 phút) để đặt mật khẩu mới, sau đó quay lại đây đăng nhập. Mật khẩu hiện tại vẫn dùng được cho đến khi bạn đặt mật khẩu mới.
          </Txt>
        </View>
        {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
        <Btn
          label={cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại email'}
          icon="send"
          variant="ghost"
          block
          disabled={cooldown > 0}
          loading={submitting}
          onPress={submit}
        />
        <Btn label="Quay lại đăng nhập" icon="back" block onPress={onBack} />
        <Btn label="Dùng email khác" variant="plain" block onPress={changeEmail} />
      </>
    );
  }

  return (
    <>
      <Txt variant="body" muted style={[styles.center, styles.subtitle]}>
        Nhập email tài khoản Thu ngân / Pha chế. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu vào email này.
      </Txt>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoFocus={!initialEmail}
        onSubmitEditing={submit}
        left={<Icon name="mail" size={17} color={theme.color_text_caption} />}
      />
      {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
      <Btn label="Gửi hướng dẫn" icon="send" block loading={submitting} onPress={submit} />
      <Btn label="Quay lại đăng nhập" variant="plain" block onPress={onBack} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  subtitle: { marginTop: -10 },
  sent: { alignItems: 'center', gap: 8 },
  sentIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
