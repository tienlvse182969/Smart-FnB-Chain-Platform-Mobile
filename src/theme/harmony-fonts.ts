/**
 * HarmonyOS Sans — nạp runtime từ `assets/fonts/`.
 * 3 face .ttf đã có sẵn trong repo. Được nạp ở `app/_layout.tsx` qua `useFonts`.
 */

export const HARMONY_FAMILY = {
  regular: 'HarmonyOSSans-Regular',
  medium: 'HarmonyOSSans-Medium',
  semibold: 'HarmonyOSSans-Semibold',
  bold: 'HarmonyOSSans-Bold',
  black: 'HarmonyOSSans-Black',
} as const;

export const harmonyFontMap: Record<string, number> = {
  [HARMONY_FAMILY.regular]: require('../../assets/fonts/HarmonyOS_Sans_Regular.ttf'),
  [HARMONY_FAMILY.medium]: require('../../assets/fonts/HarmonyOS_Sans_Medium.ttf'),
  [HARMONY_FAMILY.semibold]: require('../../assets/fonts/HarmonyOS_Sans_Semibold.ttf'),
  [HARMONY_FAMILY.bold]: require('../../assets/fonts/HarmonyOS_Sans_Bold.ttf'),
  [HARMONY_FAMILY.black]: require('../../assets/fonts/HarmonyOS_Sans_Black.ttf'),
};
