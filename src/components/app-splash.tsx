import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

const FADE_MS = 400;
/** Ảnh nền lỗi/không load được thì vẫn phải tắt splash native, tránh kẹt app. */
const NATIVE_SPLASH_FALLBACK_MS = 3000;

// Giữ splash native (chỉ có màu + icon) cho tới khi ảnh nền của splash JS hiện lên,
// tránh khoảng chỉ thấy nền màu trơn giữa hai lớp splash.
SplashScreen.preventAutoHideAsync().catch(() => {});

let nativeSplashHidden = false;
function hideNativeSplash() {
  if (nativeSplashHidden) return;
  nativeSplashHidden = true;
  SplashScreen.hideAsync().catch(() => {});
}

type AppSplashProps = {
  visible: boolean;
};

/**
 * In-app splash shown right after the native splash. expo-splash-screen can only
 * render an icon on a solid color, so the background photo lives here instead.
 *
 * Phải render đúng một instance (cùng vị trí trong cây) suốt từ lúc mở app tới khi ẩn,
 * để ảnh nền không bị load lại.
 */
export function AppSplash({ visible }: AppSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [backgroundShown, setBackgroundShown] = useState(false);
  const [hidden, setHidden] = useState(false);

  const onBackgroundShown = () => {
    setBackgroundShown(true);
    hideNativeSplash();
  };

  useEffect(() => {
    const timer = setTimeout(onBackgroundShown, NATIVE_SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  // Chỉ mờ đi khi app đã sẵn sàng VÀ ảnh nền đã hiện — không thì người dùng chỉ thấy nền màu trơn.
  useEffect(() => {
    if (visible || !backgroundShown) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [visible, backgroundShown, opacity]);

  if (hidden) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <Image
        source={require('@/assets/images/splash-screen-background.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onDisplay={onBackgroundShown}
        onError={onBackgroundShown}
      />
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={styles.icon}
        contentFit="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E2A38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 200,
    height: 200,
  },
});
