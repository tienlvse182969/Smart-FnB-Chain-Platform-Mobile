import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

export type AppLanguage = 'vi' | 'en';
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['vi', 'en'];
const DEFAULT_LANGUAGE: AppLanguage = 'vi';
const STORAGE_KEY = 'smart_fnb.language';

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

/** Không auto-detect ngôn ngữ hệ điều hành — chỉ khôi phục lựa chọn đã lưu, mặc định 'vi'. */
export async function loadStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as AppLanguage)) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // giữ ngôn ngữ mặc định nếu đọc storage lỗi
  }
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // bỏ qua — lựa chọn vẫn có hiệu lực trong phiên hiện tại
  }
}

export default i18n;
