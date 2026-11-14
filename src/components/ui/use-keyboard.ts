import { useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, Platform, type ScrollView } from 'react-native';

// iOS báo trước khi bàn phím hiện (mượt hơn); Android chỉ có sự kiện Did*.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * Chiều cao bàn phím đang mở (0 khi đóng). Cần tự đo vì app bật edge-to-edge trên Android:
 * cửa sổ không còn tự co lại khi bàn phím hiện, nên `KeyboardAvoidingView` không đủ.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(HIDE, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * Cho ô nhập nằm cuối một ScrollView: khi ô đang focus và bàn phím vừa hiện (khung đã co lại),
 * cuộn xuống cuối để ô nhập không bị bàn phím che. Gắn `onFocus`/`onBlur` trả về vào ô nhập.
 */
export function useScrollToEndOnKeyboard(scrollRef: RefObject<ScrollView | null>) {
  const focused = useRef(false);
  useEffect(() => {
    const sub = Keyboard.addListener(SHOW, () => {
      if (!focused.current) return;
      // Đợi khung dialog co lại theo chiều cao bàn phím rồi mới cuộn.
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => sub.remove();
  }, [scrollRef]);
  return {
    onFocus: () => {
      focused.current = true;
      // Bàn phím đã mở sẵn (chuyển từ ô khác sang) thì không có sự kiện hiện mới.
      if (Keyboard.isVisible()) scrollRef.current?.scrollToEnd({ animated: true });
    },
    onBlur: () => {
      focused.current = false;
    },
  };
}
