import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const FADE_MS = 400;

type AppSplashProps = {
  visible: boolean;
};

/**
 * In-app splash shown right after the native splash. expo-splash-screen can only
 * render an icon on a solid color, so the background photo lives here instead.
 */
export function AppSplash({ visible }: AppSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const hidden = useRef(false);

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => {
      hidden.current = true;
    });
  }, [visible, opacity]);

  if (!visible && hidden.current) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <Image
        source={require('@/assets/images/splash-screen-background.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
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
