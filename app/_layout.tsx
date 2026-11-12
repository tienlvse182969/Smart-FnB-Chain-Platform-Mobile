import '@/src/theme/global-font';

import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/src/auth/auth-context';
import { BrandingProvider } from '@/src/branding/branding-context';
import { AppSplash } from '@/src/components/app-splash';
import { StoreProvider } from '@/src/data/store';
import { loadStoredLanguage } from '@/src/i18n';
import { StationProvider } from '@/src/stations/station-context';
import { harmonyFontMap } from '@/src/theme/harmony-fonts';
import { appLightTheme } from '@/src/theme/use-theme';

export const unstable_settings = {
  anchor: 'login',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    antoutline: require('@ant-design/icons-react-native/fonts/antoutline.ttf'),
    antfill: require('@ant-design/icons-react-native/fonts/antfill.ttf'),
    ...harmonyFontMap,
  });
  const [languageLoaded, setLanguageLoaded] = useState(false);
  // Tải sẵn ảnh nền login để khi splash mờ đi màn login đã có hình, không lộ nền trơn.
  const [loginBackground, loginBackgroundError] = useAssets(require('@/assets/images/login-background.jpg'));

  useEffect(() => {
    loadStoredLanguage().finally(() => setLanguageLoaded(true));
  }, []);

  const ready = fontsLoaded && languageLoaded && (!!loginBackground || !!loginBackgroundError);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {ready ? (
        <SafeAreaProvider>
          <AuthProvider>
            {/* Theme theo thương hiệu chuỗi nằm trong AuthProvider: chưa đăng nhập (màn login) thì dùng theme gốc. */}
            <BrandingProvider>
              <StationProvider>
                <StoreProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: appLightTheme.fill_body },
                    }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="select-station" />
                    <Stack.Screen name="(cashier)" />
                    <Stack.Screen name="(barista)" />
                  </Stack>
                  <StatusBar style="dark" />
                </StoreProvider>
              </StationProvider>
            </BrandingProvider>
          </AuthProvider>
        </SafeAreaProvider>
      ) : null}
      {/* Luôn cùng một instance ở cùng vị trí → không mount lại, ảnh nền không phải load lại. */}
      <AppSplash visible={!ready} />
    </GestureHandlerRootView>
  );
}
