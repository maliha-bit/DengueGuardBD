import { MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5">
        <EmptyState
          icon={MapPinOff}
          title={<span className="text-lg">{t('notFound.title')}</span>}
          message={t('notFound.message')}
          action={
            <Link
              to="/"
              className="inline-flex min-h-touch items-center rounded-full bg-brand-lime px-5 text-sm font-medium text-brand-ink"
            >
              {t('notFound.backHome')}
            </Link>
          }
        />
      </div>
    </main>
  );
}
