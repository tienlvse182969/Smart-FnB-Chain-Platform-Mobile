// expo-secure-store không có bản web, nên trên trình duyệt lưu token vào localStorage.
const ACCESS_TOKEN = 'smartfnb.accessToken';
const REFRESH_TOKEN = 'smartfnb.refreshToken';

export type TokenPair = { accessToken: string; refreshToken: string };

export async function getTokens(): Promise<TokenPair | null> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function saveTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN, tokens.refreshToken);
}

export async function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
}
