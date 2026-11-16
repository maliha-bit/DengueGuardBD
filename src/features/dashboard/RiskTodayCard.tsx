import { AlertTriangle, Gauge, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useLatestForecast } from '@/api/queries';
import type { RiskLevel } from '@/api/types';
import { QueryState } from '@/components/QueryState';
import { Card, EmptyState, Skeleton, SkeletonGroup, StatValue } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { CardLink } from './CardLink';
import { summarizeToday, type TodaySummary } from './forecastSummary';

const LEVELS: Array<{ level: RiskLevel; icon: LucideIcon; bg: string }> = [
  { level: 'high', icon: ShieldAlert, bg: 'bg-brand-risk-high' },
  { level: 'medium', icon: AlertTriangle, bg: 'bg-brand-risk-medium' },
  { level: 'low', icon: ShieldCheck, bg: 'bg-brand-risk-low' },
];

const MAX_D = 168;
const MIN_D = 92;

/** Three overlapping circles, area roughly proportional to the division count. */
function RiskBubbles({ counts }: { counts: TodaySummary['counts'] }) {
  const { t, n } = useLocale();
  const max = Math.max(1, ...Object.values(counts));
  // Biggest first; ties keep high → medium → low order.
  const ranked = [...LEVELS]
    .map((item) => ({
      ...item,
      count: counts[item.level],
      size: Math.round(MIN_D + (MAX_D - MIN_D) * Math.sqrt(counts[item.level] / max)),
    }))
    .sort((a, b) => b.count - a.count);

  // Layout in px on a nominal canvas, rendered in % so it scales down on narrow cards.
  const d0 = ranked[0]?.size ?? MAX_D;
  const slots = [
    { left: 0, top: 0 },
    { left: Math.round(d0 * 0.9), top: Math.round(d0 * 0.08) },
    { left: Math.round(d0 * 0.48), top: Math.round(d0 * 0.72) },
  ];
  const placed = ranked.map((item, i) => ({ ...item, ...(slots[i] ?? { left: 0, top: 0 }) }));
  const width = Math.max(...placed.map((p) => p.left + p.size));
  const height = Math.max(...placed.map((p) => p.top + p.size));
  const pct = (value: number, of: number) => `${(value / of) * 100}%`;

  return (
    <ul
      aria-label={t('dashboard.riskToday.title')}
      className="relative mx-auto my-6 w-full"
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
    >
      {placed.map(({ level, icon: Icon, bg, count, size, left, top }, i) => (
        <li
          key={level}
          className={cn(
            'absolute flex aspect-square flex-col items-center justify-center rounded-full text-brand-ink ring-4 ring-white',
            bg,
          )}
          style={{
            width: pct(size, width),
            left: pct(left, width),
            top: pct(top, height),
            zIndex: i + 1,
          }}
        >
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
          <span
            className={cn('font-semibold leading-none', size > 130 ? 'text-[2.5rem]' : 'text-3xl')}
          >
            {n(count)}
          </span>
          <span className="mt-1 text-xs font-medium">{t(`risk.${level}`)}</span>
        </li>
      ))}
    </ul>
  );
}

function TrendBar({
  label,
  value,
  total,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const { t, n } = useLocale();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p>
          <span className="text-[2rem] font-semibold leading-none">{n(pct)}</span>
          <span className="ml-0.5 text-xs text-brand-muted">%</span>
        </p>
        <p className="text-xs text-brand-muted">
          {label} · {t('dashboard.riskToday.ofTotal', { value: n(value), total: n(total) })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-valuetext={t('dashboard.riskToday.ofTotal', { value: n(value), total: n(total) })}
        className="mt-2 h-3 overflow-hidden rounded-full bg-brand-canvas"
      >
        <div className={cn('h-full rounded-full', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RiskTodayCard({ className }: { className?: string }) {
  const { t, n } = useLocale();
  const query = useLatestForecast();
  return (
    <Card
      title={t('dashboard.riskToday.title')}
      icon={Gauge}
      actions={<CardLink to="/risk-map" label={t('dashboard.riskToday.open')} />}
      className={cn('flex flex-col', className)}
    >
      <QueryState
        query={query}
        isEmpty={(run) => run.forecasts.length === 0}
        skeleton={
          <SkeletonGroup className="flex flex-col gap-4">
            <Skeleton shape="rect" className="h-10 w-1/2" />
            <Skeleton shape="circle" className="mx-auto h-52 w-52" />
            <Skeleton shape="text" />
            <Skeleton shape="text" />
          </SkeletonGroup>
        }
        empty={
          <EmptyState
            icon={Gauge}
            title={t('dashboard.riskToday.emptyTitle')}
            message={t('dashboard.riskToday.emptyMessage')}
          />
        }
      >
        {(run) => {
          const summary = summarizeToday(run);
          return (
            <div className="flex flex-1 flex-col">
              <StatValue
                value={summary.counts.high}
                unit={t('dashboard.riskToday.highUnit', { total: n(summary.total) })}
              />
              <RiskBubbles counts={summary.counts} />
              <div className="mt-auto flex flex-col gap-4">
                <TrendBar
                  label={t('dashboard.riskToday.rising')}
                  value={summary.rising}
                  total={summary.total}
                  barClass="bg-brand-lavender"
                />
                <TrendBar
                  label={t('dashboard.riskToday.falling')}
                  value={summary.falling}
                  total={summary.total}
                  barClass="bg-brand-ink"
                />
              </div>
            </div>
          );
        }}
      </QueryState>
    </Card>
  );
}
