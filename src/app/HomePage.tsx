import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageToggle } from '@/components/LanguageToggle';

/** Temporary landing page until the citizen shell is built. */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <LanguageToggle />
      </div>
      <h1 className="text-title">{t('home.title')}</h1>
      <p className="text-brand-muted">{t('home.subtitle')}</p>
      {import.meta.env.DEV && (
        <Link
          to="/dev/ui"
          className="inline-flex min-h-touch w-fit items-center gap-2 rounded-full bg-brand-lime px-5 text-sm font-medium text-brand-ink"
        >
          {t('home.devLink')}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </main>
  );
}
