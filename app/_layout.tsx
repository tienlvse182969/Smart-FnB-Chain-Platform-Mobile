import '@/src/theme/global-font';

import { Provider as AntdProvider } from '@ant-design/react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { StoreProvider } from '@/src/data/store';
import { loadStoredLanguage } from '@/src/i18n';
import { harmonyFontMap } from '@/src/theme/harmony-fonts';
import { AppThemeContext, appLightTheme } from '@/src/theme/use-theme';

export const unstable_settings = {
  anchor: '(waiter)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    antoutline: require('@ant-design/icons-react-native/fonts/antoutline.ttf'),
    antfill: require('@ant-design/icons-react-native/fonts/antfill.ttf'),
    ...harmonyFontMap,
  });
  const [languageLoaded, setLanguageLoaded] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setLanguageLoaded(true));
  }, []);

  if (!fontsLoaded || !languageLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeContext.Provider value={appLightTheme}>
          <AntdProvider theme={appLightTheme}>
            <StoreProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: appLightTheme.fill_body },
                }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(waiter)" />
                <Stack.Screen name="(kitchen)" />
              </Stack>
              <StatusBar style="dark" />
            </StoreProvider>
          </AntdProvider>
        </AppThemeContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
