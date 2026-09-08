import { createContext, useContext } from 'react';
import defaultTheme from '@ant-design/react-native/lib/style/themes/default';
import type { Theme } from '@ant-design/react-native/lib/style';

import { lightTheme } from './antd-theme';

export const appLightTheme = { ...defaultTheme, ...lightTheme } as Theme;

/**
 * Context riêng của app cho theme token — cùng dữ liệu truyền vào `<Provider theme>`
 * của antd, nhưng không phụ thuộc việc antd resolve module context ra sao.
 */
export const AppThemeContext = createContext<Theme>(appLightTheme);

export function useAppTheme(): Theme {
  return useContext(AppThemeContext);
}
