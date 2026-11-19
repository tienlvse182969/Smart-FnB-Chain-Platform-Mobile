import * as WebBrowser from 'expo-web-browser';

/**
 * Trang chính sách quyền riêng tư trên bản web (route `/privacy`), cũng là link khai báo trên Google Play.
 * Đặt `EXPO_PUBLIC_PRIVACY_POLICY_URL` trong `.env` / `eas.json` để đổi theo môi trường.
 */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://smartfnb.tech/privacy';

/** Mở chính sách trong trình duyệt trong app; người dùng đóng là quay lại đúng màn đang ở. */
export function openPrivacyPolicy() {
  return WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => undefined);
}
