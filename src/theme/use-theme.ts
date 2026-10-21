import { createContext, useContext } from 'react';
import defaultTheme from '@ant-design/react-native/lib/style/themes/default';
import type { Theme } from '@ant-design/react-native/lib/style';

import { lightTheme } from './antd-theme';

/**
 * Theme antd + token riêng của app: `brand_on_primary` là màu chữ/biểu tượng vẽ trên nền `brand_primary`
 * (đổi theo màu chủ đạo của chuỗi để đủ tương phản). Không ghi đè `color_text_base_inverse` vì antd còn dùng nó
 * cho chữ trên nền tối cố định như Toast.
 */
export type AppThemeTokens = Theme & { brand_on_primary: string };

export const appLightTheme = { ...defaultTheme, ...lightTheme, brand_on_primary: '#FFFFFF' } as AppThemeTokens;

/**
 * Context riêng của app cho theme token — cùng dữ liệu truyền vào `<Provider theme>`
 * của antd, nhưng không phụ thuộc việc antd resolve module context ra sao.
 */
export const AppThemeContext = createContext<AppThemeTokens>(appLightTheme);

export function useAppTheme(): AppThemeTokens {
  return useContext(AppThemeContext);
}
