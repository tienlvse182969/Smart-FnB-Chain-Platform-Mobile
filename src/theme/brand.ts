import { absoluteLogoUrl, type RawBranding } from '@/src/services/branding-api';
import { lightTheme } from './antd-theme';
import type { AppThemeTokens } from './use-theme';

/**
 * Nhận diện thương hiệu của chuỗi (OW-07) áp cho app Thu ngân / Pha chế — cùng quy tắc với web
 * (`src/theme/index.ts`): chỉ màu chủ đạo + logo + tên, màu ngữ nghĩa/trạng thái không bao giờ bị ghi đè (BR-42).
 */

export type BrandTokens = {
  primary: string;
  /** Màu chữ/biểu tượng trên nền `primary`, luôn đạt tương phản WCAG AA 4.5:1 (BR-43). */
  primaryContrast: string;
  displayName: string;
  /** URL tuyệt đối của logo chuỗi; `undefined` = logo nền tảng. */
  logo: string | undefined;
  /** true = nhận diện riêng của chuỗi đang được áp. */
  custom: boolean;
};

/** Bộ mặc định phía backend khi chuỗi chưa cấu hình hoặc sau khi reset (`branding.service.ts`). */
export const BE_DEFAULT_BRANDING = {
  primaryColor: '#0F172A',
  secondaryColor: '#FFFFFF',
  accentColor: '#22C55E',
} as const;

/** Nhận diện nền tảng = theme đen–trắng sẵn có của app. */
export const PLATFORM_BRAND: BrandTokens = {
  primary: lightTheme.brand_primary as string,
  primaryContrast: '#FFFFFF',
  displayName: '',
  logo: undefined,
  custom: false,
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const toRgb = (hex: string): [number, number, number] => {
  const clean = hex.slice(1);
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const luminance = ([r, g, b]: [number, number, number]) => {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** Tỷ lệ tương phản WCAG 2.0 giữa hai màu hex. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(toRgb(a));
  const lb = luminance(toRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Nhân từng kênh RGB với `factor` (0–1): 1 = giữ nguyên, càng nhỏ càng sẫm. */
function scaleColor(hex: string, factor: number): string {
  const channels = toRgb(hex).map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Pha màu với đen theo tỷ lệ `amount` (0–1), dùng cho trạng thái nhấn (`*_tap`). */
export function darken(hex: string, amount: number): string {
  return scaleColor(hex, 1 - amount);
}

export const LIGHT_INK = '#FFFFFF';
/** Chữ đậm cho màu chủ đạo quá sáng (vàng…) — cùng giá trị với web. */
export const DARK_INK = '#1A1206';
const MIN_RATIO = 4.5;
/** Làm sẫm mỗi bước 2%, tối đa còn 62% độ sáng. */
const STEP_PERCENT = 2;
const FLOOR_PERCENT = 62;

/**
 * Nền + chữ thương hiệu từ màu chủ đạo — cùng quy tắc với web (`src/theme/brandColor.ts` → `deriveBrandSurface`).
 * Làm sẫm màu chủ đạo dần tới khi chữ trắng đạt 4.5:1; màu quá sáng không sẫm nổi tới mức đó (vàng…) thì giữ
 * nguyên và dùng chữ đậm. Tránh chữ đen trên các màu tầm trung (xanh, đỏ, tím, cam) như quy tắc cũ.
 */
export function deriveBrandSurface(primary: string): { surface: string; ink: string } {
  const base = scaleColor(primary, 1);
  for (let percent = 100; percent >= FLOOR_PERCENT; percent -= STEP_PERCENT) {
    const candidate = scaleColor(base, percent / 100);
    if (contrastRatio(candidate, LIGHT_INK) >= MIN_RATIO) return { surface: candidate, ink: LIGHT_INK };
  }
  return { surface: base, ink: DARK_INK };
}

const same = (a: string | undefined, b: string) => (a ?? '').toLowerCase() === b.toLowerCase();

/**
 * Chọn nhận diện hiệu lực. Chưa có dữ liệu, dữ liệu mặc định của BE (màu mặc định và không logo) hoặc màu không hợp lệ
 * đều trả nhận diện nền tảng (BR-44).
 */
export function resolveBrand(raw: RawBranding | null): BrandTokens {
  if (!raw || !HEX.test(raw.primaryColor)) return PLATFORM_BRAND;
  const custom = !!raw.logoUrl || !same(raw.primaryColor, BE_DEFAULT_BRANDING.primaryColor);
  if (!custom) return PLATFORM_BRAND;
  const { surface, ink } = deriveBrandSurface(raw.primaryColor);
  return {
    primary: surface,
    primaryContrast: ink,
    displayName: raw.displayName.trim(),
    logo: absoluteLogoUrl(raw.logoUrl),
    custom: true,
  };
}

/** Theme app + antd theo nhận diện: chỉ đổi token màu chủ đạo, mọi token khác (nền, viền, chữ, bo góc) giữ nguyên. */
export function buildBrandTheme(base: AppThemeTokens, brand: BrandTokens): AppThemeTokens {
  if (!brand.custom) return base;
  const tap = darken(brand.primary, 0.15);
  return {
    ...base,
    brand_primary: brand.primary,
    brand_primary_tap: tap,
    primary_button_fill: brand.primary,
    primary_button_fill_tap: tap,
    color_link: brand.primary,
    brand_on_primary: brand.primaryContrast,
  };
}
