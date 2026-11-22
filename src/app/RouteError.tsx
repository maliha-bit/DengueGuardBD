import { Link, useRouteError } from 'react-router-dom';
import { buttonClasses, Card, ErrorState } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { useOnline } from '@/lib/pwa';

/**
 * Shown when a page fails to load (for example its code chunk could not download offline).
 * Retry reloads; the offline help page always works because it ships with the app shell.
 */
export function RouteError() {
  const { t } = useLocale();
  const online = useOnline();
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <ErrorState
          title={t('offline.pageErrorTitle')}
          message={online ? t('states.errorMessage') : t('offline.pageErrorOffline')}
          onRetry={() => window.location.reload()}
        />
        <div className="flex justify-center pb-4">
          <Link to="/offline" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t('offline.bannerLink')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
