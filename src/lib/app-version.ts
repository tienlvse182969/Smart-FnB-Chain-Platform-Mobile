import Constants from 'expo-constants';

/** Phiên bản app — ánh xạ từ `expo.version` trong app.json (qua expo-constants). */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
