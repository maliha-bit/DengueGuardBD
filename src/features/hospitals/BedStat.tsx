import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

/** "12 / 80 free" big number with a small progress bar. */
export function BedStat({
  label,
  available,
  total,
  barClass = 'bg-brand-lavender',
}: {
  label: string;
  available: number;
  total: number;
  barClass?: string;
}) {
  const { t, n } = useLocale();
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const summary = t('hospitals.bedsOf', { available: n(available), total: n(total) });
  return (
    <div className="min-w-0">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[2rem] font-semibold leading-none">{n(available)}</span>
        <span className="text-xs text-brand-muted">
          / {n(total)} {t('hospitals.free')}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={available}
        aria-valuetext={summary}
        className="mt-2 h-2 overflow-hidden rounded-full bg-brand-canvas"
      >
        <div className={cn('h-full rounded-full', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
