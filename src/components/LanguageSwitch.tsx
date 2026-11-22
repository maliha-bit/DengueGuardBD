import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { Language } from '@/lib/i18n';

const OPTIONS: Array<{ lang: Language; label: string }> = [
  { lang: 'en', label: 'EN' },
  { lang: 'bn', label: 'বাংলা' },
];

/** EN | বাংলা segmented switch; changes language without a reload (NFR25). */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="inline-flex rounded-full bg-white p-0.5"
    >
      {OPTIONS.map(({ lang, label }) => {
        const active = i18n.language === lang;
        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(lang)}
            className={cn(
              'min-h-touch min-w-touch rounded-full px-3 text-sm font-medium transition-colors',
              active ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-brand-canvas',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
