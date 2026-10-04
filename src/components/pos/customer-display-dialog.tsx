import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useNow } from '@/src/data/use-now';
import { DisplayPairingError, isPairingMock } from '@/src/services/display-pairing-api';
import { useCustomerDisplay } from '@/src/stations/customer-display-context';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

const CODE_LENGTH = 6;
const DANGER = '#C0392B';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

const mmss = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

type Feedback =
  | { kind: 'none' }
  | { kind: 'invalid' | 'expired'; attemptsLeft?: number }
  | { kind: 'network' };

/** Đồng hồ khoá ghép — tách riêng để chỉ phần này vẽ lại mỗi giây. */
function LockedNotice({ until, onDone }: { until: number; onDone: () => void }) {
  const { t } = useTranslation();
  const now = useNow(1000);
  const remaining = until - now;
  useEffect(() => {
    if (remaining <= 0) onDone();
  }, [remaining, onDone]);
  return (
    <View style={styles.feedbackRow}>
      <Icon name="lock" size={15} color={DANGER} />
      <Txt variant="caption" color={DANGER} style={styles.feedbackText}>
        {t('customerDisplay.dialog.locked', { time: mmss(remaining) })}
      </Txt>
    </View>
  );
}

/**
 * Ghép màn hình phía khách với quầy đang chọn (11.10): thu ngân nhập mã OTP 6 số đang hiện trên
 * màn hình khách. Bàn phím số dựng sẵn trong hộp thoại — POS là màn hình cảm ứng, bàn phím hệ thống
 * sẽ che mất hộp thoại khi tablet nằm ngang. Đủ 6 số thì tự gửi. Gắn một lần cạnh
 * `CustomerDisplayProvider`; mở bằng `openPairing()` từ bất kỳ đâu.
 */
export function CustomerDisplayDialog() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { station, link, pair, pairingOpen: visible, closePairing: onClose } = useCustomerDisplay();

  const [digits, setDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  // khoá do server báo — giữ qua các lần mở hộp thoại cho tới khi hết giờ
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  // mỗi lần mở: xoá mã đang nhập dở, quay về bước nhập
  useEffect(() => {
    if (!visible) return;
    setDigits('');
    setFeedback({ kind: 'none' });
    setDone(false);
  }, [visible]);

  const locked = lockedUntil !== null;
  const inputDisabled = submitting || locked || done;

  const submit = async (code: string) => {
    setSubmitting(true);
    setFeedback({ kind: 'none' });
    try {
      await pair(code);
      setDone(true);
    } catch (reason) {
      setDigits('');
      if (reason instanceof DisplayPairingError) {
        if (reason.kind === 'locked') setLockedUntil(reason.retryAt ?? Date.now());
        else if (reason.kind === 'network') setFeedback({ kind: 'network' });
        else setFeedback({ kind: reason.kind, attemptsLeft: reason.attemptsLeft });
      } else {
        setFeedback({ kind: 'network' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (inputDisabled) return;
    if (key === 'clear') {
      setDigits('');
      return;
    }
    if (key === 'back') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (digits.length >= CODE_LENGTH) return;
    const next = digits + key;
    setDigits(next);
    if (feedback.kind !== 'none') setFeedback({ kind: 'none' });
    if (next.length === CODE_LENGTH) void submit(next);
  };

  // bản web (chạy thử trên máy tính): cho gõ số bằng bàn phím thật
  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) pressRef.current(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') pressRef.current('back');
      else if (e.key === 'Escape') pressRef.current('clear');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  const stationName = station?.name ?? '';
  const hasError = feedback.kind !== 'none';

  if (done) {
    return (
      <AppModal visible={visible} title={t('customerDisplay.dialog.successTitle')} icon="displayPaired" onClose={onClose}>
        <Txt variant="body" muted style={styles.center}>
          {t('customerDisplay.dialog.successHint', { station: stationName })}
        </Txt>
        <Btn label={t('customerDisplay.dialog.done')} block onPress={onClose} style={styles.doneBtn} />
      </AppModal>
    );
  }

  return (
    <AppModal visible={visible} title={t('customerDisplay.dialog.title')} icon="display" onClose={onClose}>
      {link.status === 'connected' || link.status === 'disconnected' ? (
        <View style={[styles.current, { borderColor: theme.border_color_thin, backgroundColor: theme.fill_body }]}>
          <Icon name="displayPaired" size={18} />
          <Txt variant="caption" style={styles.feedbackText}>
            {t('customerDisplay.dialog.replaceHint', { station: stationName })}
          </Txt>
        </View>
      ) : null}

      <Txt variant="body" muted style={styles.center}>
        {t('customerDisplay.dialog.instruction', { station: stationName })}
      </Txt>

      <View style={styles.boxes} accessibilityLabel={t('customerDisplay.dialog.codeLabel')}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = !inputDisabled && i === digits.length;
          return (
            <View
              key={i}
              style={[
                styles.box,
                i === 3 && styles.boxGap,
                {
                  borderColor: hasError ? DANGER : active ? theme.brand_primary : theme.border_color_base,
                  borderWidth: active ? 2 : 1,
                  backgroundColor: locked ? theme.fill_disabled : theme.fill_base,
                },
              ]}>
              <Txt style={styles.digit}>{digits[i] ?? ''}</Txt>
            </View>
          );
        })}
      </View>

      <View style={styles.feedback}>
        {submitting ? (
          <View style={styles.feedbackRow}>
            <ActivityIndicator size="small" color={theme.brand_primary} />
            <Txt variant="caption" muted>
              {t('customerDisplay.dialog.submitting')}
            </Txt>
          </View>
        ) : lockedUntil !== null ? (
          <LockedNotice until={lockedUntil} onDone={() => setLockedUntil(null)} />
        ) : hasError ? (
          <View style={styles.feedbackRow}>
            <Icon name="clear" size={15} color={DANGER} />
            <Txt variant="caption" color={DANGER} style={styles.feedbackText}>
              {t(`customerDisplay.dialog.errors.${feedback.kind}`)}
              {'attemptsLeft' in feedback && feedback.attemptsLeft !== undefined
                ? ` ${t('customerDisplay.dialog.attemptsLeft', { count: feedback.attemptsLeft })}`
                : ''}
            </Txt>
          </View>
        ) : (
          <Txt variant="caption" muted style={styles.center}>
            {t('customerDisplay.dialog.codeHint')}
          </Txt>
        )}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            disabled={inputDisabled}
            onPress={() => press(key)}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? t('customerDisplay.dialog.backspace') : key === 'clear' ? t('customerDisplay.dialog.clear') : key}
            style={({ pressed }) => [
              styles.key,
              { borderColor: theme.border_color_thin, backgroundColor: pressed ? theme.fill_tap : theme.fill_base },
              inputDisabled && styles.keyDisabled,
            ]}>
            {key === 'back' ? (
              <Icon name="backspace" size={22} />
            ) : key === 'clear' ? (
              <Txt variant="bodyStrong">{t('customerDisplay.dialog.clear')}</Txt>
            ) : (
              <Txt style={styles.keyText}>{key}</Txt>
            )}
          </Pressable>
        ))}
      </View>

      {isPairingMock ? (
        <Txt variant="tiny" muted style={styles.center}>
          {t('customerDisplay.dialog.mockHint')}
        </Txt>
      ) : null}

      <Btn label={t('customerDisplay.dialog.cancel')} variant="ghost" block onPress={onClose} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  box: { width: 46, height: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  boxGap: { marginLeft: 12 },
  digit: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  feedback: { minHeight: 36, justifyContent: 'center' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  feedbackText: { flexShrink: 1 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '31.6%',
    flexGrow: 1,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28 },
  doneBtn: { marginTop: 8 },
});
