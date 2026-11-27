import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { initials, type AvatarAnchor } from '@/src/components/staff-avatar';
import { Btn } from '@/src/components/ui/button';
import { Icon, IconButton } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { Txt } from '@/src/components/ui/txt';
import { staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { StaffRole } from '@/src/data/types';
import { setAppLanguage, type AppLanguage } from '@/src/i18n';
import { APP_VERSION } from '@/src/lib/app-version';
import { openPrivacyPolicy } from '@/src/lib/legal-links';
import { staffRoleKey } from '@/src/i18n/labels';
import { getProfile } from '@/src/services/auth-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

const ENTER_MS = 280;
const EXIT_MS = 200;

type AccountProps = {
  role: StaffRole;
  children?: ReactNode;
  settings?: ReactNode;
};

/**
 * Tài khoản dùng chung cho Cashier và Barista — hiện dạng modal khi bấm avatar ở NavRail.
 * Là overlay trong cây của layout (không dùng `AppModal`/Portal) để mục con còn dùng được
 * các provider của layout, và hộp thoại `AppModal` mở từ bên trong (máy in, ghép màn hình khách)
 * vẫn nổi lên trên.
 * `children` = mục riêng của từng vai trò, hiện ngay dưới thẻ hồ sơ.
 * `settings` = cài đặt thiết bị riêng của vai trò, hiện thành thẻ dưới thẻ Ngôn ngữ.
 */
export function AccountScreen({
  visible,
  onClose,
  anchor,
  ...props
}: AccountProps & {
  visible: boolean;
  onClose: () => void;
  /** Vị trí nút avatar trên màn hình: modal bay ra từ đây và thu về đây khi đóng. */
  anchor?: AvatarAnchor;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  // Giữ modal trong cây thêm một nhịp sau khi `visible` = false để chạy hiệu ứng thu về.
  const [mounted, setMounted] = useState(false);
  // đã biết điểm xuất phát (cần đo cả lớp phủ lẫn khung) → mới bắt đầu bay ra, tránh nháy một khung hình
  const [ready, setReady] = useState(false);
  const overlayRef = useRef<View>(null);
  const overlayOrigin = useRef<{ x: number; y: number } | null>(null);
  const dialogCenter = useRef<{ x: number; y: number } | null>(null);
  const progress = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // dịch chuyển từ tâm khung tới tâm nút avatar (cùng hệ toạ độ của lớp phủ)
  const computeOrigin = useCallback(() => {
    const origin = overlayOrigin.current;
    const center = dialogCenter.current;
    if (!origin || !center) return;
    dx.value = anchor ? anchor.x + anchor.width / 2 - origin.x - center.x : 0;
    dy.value = anchor ? anchor.y + anchor.height / 2 - origin.y - center.y : 0;
    setReady(true);
  }, [anchor, dx, dy]);

  useEffect(() => {
    if (mounted) computeOrigin();
  }, [mounted, computeOrigin]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      if (ready) progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
    const timer = setTimeout(() => {
      setMounted(false);
      setReady(false);
      overlayOrigin.current = null;
      dialogCenter.current = null;
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, mounted, ready, progress]);

  // nút back Android đóng modal
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [
      { translateX: dx.value * (1 - progress.value) },
      { translateY: dy.value * (1 - progress.value) },
      { scale: 0.05 + 0.95 * progress.value },
    ],
  }));

  if (!mounted) return null;
  return (
    <View
      ref={overlayRef}
      style={styles.overlay}
      pointerEvents={visible ? 'auto' : 'none'}
      onLayout={() =>
        overlayRef.current?.measureInWindow((x, y) => {
          overlayOrigin.current = { x, y };
          computeOrigin();
        })
      }>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View
        pointerEvents="box-none"
        style={[
          styles.center,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 },
        ]}>
        <Animated.View
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            dialogCenter.current = { x: x + width / 2, y: y + height / 2 };
            computeOrigin();
          }}
          style={[
            styles.dialog,
            { backgroundColor: theme.fill_body, borderColor: theme.border_color_thin },
            dialogStyle,
          ]}>
          <View style={styles.dialogHeader}>
            <IconButton name="close" size={20} onPress={onClose} />
          </View>
          <AccountBody {...props} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Nội dung chỉ mount khi modal mở nên hồ sơ (chi nhánh) được tải lại mỗi lần mở. */
function AccountBody({ role, children, settings }: AccountProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { state, checkOut } = useStore();
  const { user, displayName: accountName, logout } = useAuth();
  const staff = staffByRole[role];
  const displayName = state.currentUser?.name || accountName || user?.email || staff.name;
  // chi nhánh nhân viên đang làm, lấy từ DB qua GET /auth/profile; chưa có thì chỉ hiện vai trò
  const [branchName, setBranchName] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile()
      .then((profile) => {
        if (active) setBranchName(profile.branchName);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);
  // email chỉ hiện ở dòng phụ khi dòng tên đang là họ tên (không lặp lại email hai lần)
  const email = user?.email && user.email !== displayName ? user.email : null;

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <ScrollView contentContainerStyle={styles.pad}>
        <View style={[...cardStyle, styles.profileCard]}>
          <View
            style={[
              styles.avatar,
              { borderColor: theme.border_color_base, backgroundColor: theme.fill_body },
            ]}>
            <Txt variant="title">{initials(displayName)}</Txt>
          </View>
          <Txt variant="h2" numberOfLines={1} style={styles.profileName}>
            {displayName}
          </Txt>
          {email ? (
            <Txt variant="body" muted numberOfLines={1}>
              {email}
            </Txt>
          ) : null}
          <Txt variant="caption" muted style={styles.profileRole}>
            {t(staffRoleKey[role])}
            {branchName ? ` · ${t('account.branch', { name: branchName })}` : ''}
          </Txt>
          <Btn
            label={t('account.logout')}
            icon="logout"
            block
            variant="ghost"
            style={styles.logout}
            loading={loggingOut}
            onPress={async () => {
              if (loggingOut) return;
              setLoggingOut(true);
              try {
                await logout();
                checkOut();
                router.replace('/login');
              } finally {
                setLoggingOut(false);
              }
            }}
          />
        </View>

        {children}

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
        {settings ? <View style={cardStyle}>{settings}</View> : null}

        <Image source={require('@/assets/logo/logo1.png')} style={styles.logo} resizeMode="contain" />
        <Txt variant="tiny" muted style={styles.version}>
          {t('account.version', { version: APP_VERSION })}
        </Txt>
        <Btn
          label={t('account.privacyPolicy')}
          icon="privacy"
          block
          variant="plain"
          style={styles.privacy}
          onPress={() => void openPrivacyPolicy()}
        />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, elevation: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialog: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dialogHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 12 },
  pad: { padding: 16, gap: 8 },
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
  // tên in đậm, email nhỏ hơn ở dòng dưới, vai trò nhỏ nhất
  profileName: { textAlign: 'center', fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28, marginTop: 8 },
  profileRole: { marginTop: 2 },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { flex: 1, gap: 2 },
  languageSegmented: { marginTop: 12 },
  privacy: { marginTop: 4 },
  logout: { marginTop: 14 },
  logo: { width: 160, height: 67, alignSelf: 'center', marginTop: 12 },
  version: { textAlign: 'center', marginTop: 4 },
});
