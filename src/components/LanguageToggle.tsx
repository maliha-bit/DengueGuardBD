import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Pill } from '@/components/ui';

/** Switches between English and Bangla without a page reload (NFR25). */
export function LanguageToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation();
  const isBangla = i18n.language === 'bn';
  return (
    <Pill
      tone={tone}
      leadingIcon={Languages}
      aria-label={t('common.switchLanguage')}
      onClick={() => void i18n.changeLanguage(isBangla ? 'en' : 'bn')}
      lang={isBangla ? 'en' : 'bn'}
    >
      {isBangla ? t('common.english') : t('common.bangla')}
    </Pill>
  );
}
