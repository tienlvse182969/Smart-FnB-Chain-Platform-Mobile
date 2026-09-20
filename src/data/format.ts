import i18n from '@/src/i18n';

export const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`;

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return diffMs >= 0 ? i18n.t('format.justNow') : i18n.t('format.rightNow');
  const label =
    mins < 60
      ? i18n.t('format.minutesShort', { count: mins })
      : i18n.t('format.hoursShort', { count: Math.round(mins / 60) });
  return diffMs >= 0 ? i18n.t('format.ago', { label }) : i18n.t('format.in', { label });
}

export function clockAt(iso: string): string {
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function durationSince(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0
    ? i18n.t('format.hoursMinutesShort', { h, m })
    : i18n.t('format.minutesShort', { count: m });
}
