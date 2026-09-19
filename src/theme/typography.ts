import { StyleSheet } from 'react-native';

import { HARMONY_FAMILY } from './harmony-fonts';

/** Preset chữ dùng cho các component tự dựng. Chữ khác đã được `global-font` phủ Regular. */
export const text = StyleSheet.create({
  display: { fontFamily: HARMONY_FAMILY.bold, fontSize: 28, lineHeight: 34 },
  h1: { fontFamily: HARMONY_FAMILY.black, fontSize: 32, lineHeight: 38 },
  h2: { fontFamily: HARMONY_FAMILY.medium, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: HARMONY_FAMILY.medium, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: HARMONY_FAMILY.medium, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: HARMONY_FAMILY.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: HARMONY_FAMILY.medium, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: HARMONY_FAMILY.regular, fontSize: 12, lineHeight: 16 },
  tiny: { fontFamily: HARMONY_FAMILY.regular, fontSize: 11, lineHeight: 14 },
});

export const fontFamily = HARMONY_FAMILY;
