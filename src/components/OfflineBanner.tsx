import { WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/lib/useLocale';
import { useOnline } from '@/lib/pwa';

/** "You are offline" banner under the top bar, with a link to the offline help page. */
export function OfflineBanner() {
  const { t } = useLocale();
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-brand-ink px-4 py-3 text-sm text-white"
    >
      <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-lime" />
      <span className="flex-1">{t('offline.banner')}</span>
      <Link
        to="/offline"
        className="inline-flex min-h-touch items-center font-semibold text-brand-lime underline underline-offset-2"
      >
        {t('offline.bannerLink')}
      </Link>
    </div>
  );
}
