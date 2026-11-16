import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

/** Bed figures older than this are marked as possibly out of date (NFR14; configurable later). */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** "Updated 20 minutes ago" + stale warning (NFR14). */
export function Freshness({
  updatedAt,
  onDark,
  className,
}: {
  updatedAt: string;
  onDark?: boolean;
  className?: string;
}) {
  const { t, lang } = useLocale();
  const stale = Date.now() - new Date(updatedAt).getTime() > STALE_AFTER_MS;
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          onDark ? 'text-white/70' : 'text-brand-muted',
        )}
      >
        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
        {t('common.updated', { time: formatRelative(updatedAt, lang) })}
      </span>
      {stale && <Badge tone="risk-medium">{t('common.maybeOutdated')}</Badge>}
    </div>
  );
}
