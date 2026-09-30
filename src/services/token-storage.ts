import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN = 'smartfnb.accessToken';
const REFRESH_TOKEN = 'smartfnb.refreshToken';

export type TokenPair = { accessToken: string; refreshToken: string };

export async function getTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN),
    SecureStore.getItemAsync(REFRESH_TOKEN),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function saveTokens(tokens: TokenPair) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
  ]);
}
