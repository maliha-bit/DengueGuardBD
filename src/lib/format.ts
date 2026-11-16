import type { Language } from './i18n';

const LOCALES: Record<Language, string> = { en: 'en-GB', bn: 'bn-BD' };

function localeFor(lang: string): string {
  return lang === 'bn' ? LOCALES.bn : LOCALES.en;
}

/** Format a number with locale digits (Bangla digits when lang is "bn"). */
export function formatNumber(value: number, lang: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeFor(lang), options).format(value);
}

/** Format a date, e.g. "16 Nov 2026" / "১৬ নভে, ২০২৬". */
export function formatDate(value: Date, lang: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    localeFor(lang),
    options ?? { day: 'numeric', month: 'short', year: 'numeric' },
  ).format(value);
}
