import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'barista.newOrderSound';
const newOrderSound = require('@/assets/sounds/new-order.mp3');

/** Cài đặt theo thiết bị: mặc định bật. Giữ trong bộ nhớ để mọi màn hình đọc cùng một giá trị. */
let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw === null) return;
      enabled = raw !== 'off';
      emit();
    })
    .catch(() => undefined);
}

export function setNewOrderSoundEnabled(value: boolean) {
  enabled = value;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, value ? 'on' : 'off').catch(() => undefined);
}

/** Bật/tắt âm báo món mới ở hàng đợi pha chế (cài đặt ở màn hình Tài khoản). */
export function useNewOrderSoundEnabled() {
  ensureLoaded();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
  );
}

/** Trình phát âm báo món mới; `play()` phát lại từ đầu. */
export function useNewOrderSoundPlayer() {
  const player = useAudioPlayer(newOrderSound);
  useEffect(() => {
    // Máy tính bảng ở quầy có thể đang để im lặng — vẫn phải nghe được báo món.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);
  return useCallback(() => {
    player.seekTo(0);
    player.play();
  }, [player]);
}

/**
 * Phát âm báo khi xuất hiện ly/phần mới trong hàng đợi (theo id). Lần tải đầu chỉ ghi nhận những
 * gì đang có, không kêu. Tắt cài đặt thì vẫn ghi nhận để khi bật lại không kêu dồn món cũ.
 */
export function useNewOrderSound(unitIds: string[] | null) {
  const soundOn = useNewOrderSoundEnabled();
  const play = useNewOrderSoundPlayer();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!unitIds) return;
    const current = new Set(unitIds);
    const previous = seen.current;
    seen.current = current;
    if (!previous) return;
    const arrived = unitIds.some((id) => !previous.has(id));
    if (arrived && soundOn) play();
    // chỉ chạy khi danh sách id đổi, không chạy lại khi bật/tắt cài đặt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitIds]);
}
