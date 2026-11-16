import type { Language } from './i18n';

const LOCALES: Record<Language, string> = { en: 'en-GB', bn: 'bn-BD' };

export function localeFor(lang: string): string {
  return lang === 'bn' ? LOCALES.bn : LOCALES.en;
}

/** Format a number with locale digits (Bangla digits when lang is "bn"). */
export function formatNumber(value: number, lang: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeFor(lang), options).format(value);
}

/** Parse "yyyy-mm-dd" as a local date (avoids UTC off-by-one). */
export function parseIsoDate(value: string): Date {
  const [y = 1970, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIsoDate(value) : new Date(value);
}

/** Format a date, e.g. "16 Nov 2026" / "১৬ নভে, ২০২৬". */
export function formatDate(
  value: Date | string,
  lang: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  return new Intl.DateTimeFormat(localeFor(lang), options).format(toDate(value));
}

export const formatWeekday = (value: Date | string, lang: string) =>
  formatDate(value, lang, { weekday: 'short' });

/** Bangla uses a 24-hour clock so no Latin AM/PM appears. */
export const formatTime = (value: Date | string, lang: string) =>
  formatDate(
    value,
    lang,
    lang === 'bn'
      ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : { hour: 'numeric', minute: '2-digit' },
  );

/** "20 minutes ago" / "২০ মিনিট আগে". */
export function formatRelative(value: Date | string, lang: string, now: Date = new Date()) {
  const seconds = Math.round((toDate(value).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86_400), 'day');
}

/** Initials for avatar chips, e.g. "Ayesha Rahman" → "AR". */
export function initials(name: string): string {
  return name
    .replace(/^(Dr\.|ডা\.)\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}
