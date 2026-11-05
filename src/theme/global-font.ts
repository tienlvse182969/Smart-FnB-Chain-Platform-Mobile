/**
 * Phủ HarmonyOS Sans lên MỌI `<Text>` của React Native (kể cả chữ bên trong
 * component của antd-mobile-rn — thư viện này không có token fontFamily).
 *
 * Cách làm: chèn `fontFamily` mặc định vào ĐẦU mảng style của Text, nên style
 * truyền vào sau vẫn ghi đè được (ví dụ đổi sang Medium/Bold).
 *
 * Chèn vào props ĐẦU VÀO của render (không sửa element đầu ra): trên web,
 * react-native-web render thẳng ra `<span>`, gán mảng style vào thẻ DOM sẽ
 * crash ("Failed to set an indexed property [0] on 'CSSStyleDeclaration'").
 *
 * Import 1 lần ở đầu `app/_layout.tsx`.
 */
import type React from 'react';
import { Text as RNText } from 'react-native';

import { HARMONY_FAMILY } from './harmony-fonts';

type TextRender = (props: { style?: unknown }, ...rest: unknown[]) => React.ReactNode;
type Patchable = { render?: TextRender } & Record<string, unknown>;

const TextComp = RNText as unknown as Patchable;

if (!TextComp.__harmonyPatched && typeof TextComp.render === 'function') {
  const original = TextComp.render.bind(TextComp);
  TextComp.render = (props, ...rest) =>
    original({ ...props, style: [{ fontFamily: HARMONY_FAMILY.regular }, props.style] }, ...rest);
  TextComp.__harmonyPatched = true;
}
