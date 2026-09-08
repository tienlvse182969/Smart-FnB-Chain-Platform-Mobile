/**
 * HarmonyOS Sans — nạp runtime từ `assets/fonts/`.
 * 3 face .ttf đã có sẵn trong repo. Được nạp ở `app/_layout.tsx` qua `useFonts`.
 */

export const HARMONY_FAMILY = {
  regular: 'HarmonyOSSans-Regular',
  medium: 'HarmonyOSSans-Medium',
  bold: 'HarmonyOSSans-Bold',
} as const;

export const harmonyFontMap: Record<string, number> = {
  [HARMONY_FAMILY.regular]: require('../../assets/fonts/HarmonyOS_Sans_Regular.ttf'),
  [HARMONY_FAMILY.medium]: require('../../assets/fonts/HarmonyOS_Sans_Medium.ttf'),
  [HARMONY_FAMILY.bold]: require('../../assets/fonts/HarmonyOS_Sans_Bold.ttf'),
};
