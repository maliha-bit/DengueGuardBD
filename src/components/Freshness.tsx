import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

/** Bed figures older than this are marked as possibly out of date (NFR14; configurable later). */
const DEFAULT_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** "Updated 20 minutes ago" + stale warning tag (NFR14). */
export function Freshness({
  updatedAt,
  stale,
  text,
  staleText,
  onDark,
  className,
}: {
  updatedAt: string;
  /** Override the default 6-hour rule. */
  stale?: boolean;
  /** Custom label, given the localised relative time. */
  text?: (time: string) => string;
  staleText?: string;
  onDark?: boolean;
  className?: string;
}) {
  const { t, lang } = useLocale();
  const time = formatRelative(updatedAt, lang);
  const isStale = stale ?? Date.now() - new Date(updatedAt).getTime() > DEFAULT_STALE_AFTER_MS;
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          onDark ? 'text-white/70' : 'text-brand-muted',
        )}
      >
        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
        {text ? text(time) : t('common.updated', { time })}
      </span>
      {isStale && <Badge tone="risk-medium">{staleText ?? t('common.maybeOutdated')}</Badge>}
    </div>
  );
}
