/**
 * Phủ HarmonyOS Sans lên MỌI `<Text>` của React Native (kể cả chữ bên trong
 * component của antd-mobile-rn — thư viện này không có token fontFamily).
 *
 * Cách làm: chèn `fontFamily` mặc định vào ĐẦU mảng style của Text, nên style
 * truyền vào sau vẫn ghi đè được (ví dụ đổi sang Medium/Bold).
 *
 * Import 1 lần ở đầu `app/_layout.tsx`.
 */
import React from 'react';
import { Text as RNText } from 'react-native';

import { HARMONY_FAMILY } from './harmony-fonts';

type Patchable = { render?: (...args: unknown[]) => React.ReactElement } & Record<string, unknown>;

const TextComp = RNText as unknown as Patchable;

if (!TextComp.__harmonyPatched && typeof TextComp.render === 'function') {
  const original = TextComp.render.bind(TextComp);
  TextComp.render = (...args: unknown[]) => {
    const element = original(...args);
    if (!React.isValidElement(element)) return element;
    const el = element as React.ReactElement<{ style?: unknown }>;
    return React.cloneElement(el, {
      style: [{ fontFamily: HARMONY_FAMILY.regular }, el.props.style],
    });
  };
  TextComp.__harmonyPatched = true;
}
