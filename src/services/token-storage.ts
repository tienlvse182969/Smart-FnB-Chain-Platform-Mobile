import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'smart_fnb.accessToken';
const REFRESH_TOKEN_KEY = 'smart_fnb.refreshToken';

/** expo-secure-store không có bản triển khai cho web — trên web dùng AsyncStorage (localStorage) thay thế. */
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        deleteItem: (key: string) => AsyncStorage.removeItem(key),
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    storage.getItem(ACCESS_TOKEN_KEY),
    storage.getItem(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([storage.deleteItem(ACCESS_TOKEN_KEY), storage.deleteItem(REFRESH_TOKEN_KEY)]);
}
