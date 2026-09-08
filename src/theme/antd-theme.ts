import type { PartialTheme } from '@ant-design/react-native/lib/style';

/**
 * Theme trắng–đen (monochrome) cho antd-mobile-rn.
 * Không dùng màu để mã hoá thông tin — trạng thái phân biệt bằng fill/viền/icon/chữ
 * (xem `src/components/status-badge.tsx`). Các token brand_* được ép về xám/đen.
 */

const mono = {
  ink: '#0A0A0A',
  ink2: '#3D3D3D',
  ink3: '#6B6B6B',
  line: '#111111',
  lineThin: '#E0E0E0',
  paper: '#FFFFFF',
  paper2: '#F5F5F5',
  tap: '#EDEDED',
};

export const lightTheme: PartialTheme = {
  brand_primary: mono.line,
  brand_primary_tap: '#333333',
  brand_success: mono.ink,
  brand_warning: mono.ink2,
  brand_error: mono.ink,
  brand_important: mono.ink,

  color_text_base: mono.ink,
  color_text_base_inverse: mono.paper,
  color_text_paragraph: mono.ink2,
  color_text_caption: mono.ink3,
  color_text_placeholder: '#9E9E9E',
  color_text_disabled: '#BBBBBB',
  color_link: mono.line,
  color_icon_base: mono.ink3,

  fill_base: mono.paper,
  fill_body: mono.paper2,
  fill_tap: mono.tap,
  fill_grey: '#F7F7F7',
  fill_disabled: '#E4E4E4',
  fill_mask: 'rgba(0,0,0,0.45)',

  border_color_base: mono.line,
  border_color_thin: mono.lineThin,

  radius_xs: 2,
  radius_sm: 2,
  radius_md: 2,
  radius_lg: 2,

  primary_button_fill: mono.line,
  primary_button_fill_tap: '#333333',
  ghost_button_color: mono.line,
  ghost_button_fill_tap: 'rgba(17,17,17,0.06)',
  warning_button_fill: mono.ink,
  warning_button_fill_tap: mono.ink2,

  toast_fill: 'rgba(10,10,10,0.9)',
  tab_bar_fill: mono.paper,
  search_bar_fill: mono.paper2,
  switch_unchecked: '#C7C7C7',
};

export type AppTheme = typeof lightTheme;
