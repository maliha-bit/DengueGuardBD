import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocalizedText } from '@/api/types';
import { formatDate, formatNumber } from './format';

/** Locale helpers bound to the current language. */
export function useLocale() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'bn' ? 'bn' : 'en';
  const l = useCallback((text: LocalizedText) => text[lang], [lang]);
  const n = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, lang, options),
    [lang],
  );
  const d = useCallback(
    (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(value, lang, options),
    [lang],
  );
  return { t, lang, l, n, d };
}
