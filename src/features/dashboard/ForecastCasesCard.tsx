import { lazy, Suspense, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useCaseTrend, useDivisions } from '@/api/queries';
import type { CaseTrend, CaseTrendPoint, TrendPeriod } from '@/api/types';
import { useDivision } from '@/app/division';
import { QueryState } from '@/components/QueryState';
import { Badge, Card, EmptyState, Pill } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatWeekday } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

// Recharts is loaded lazily to keep the first bundle small (NFR15).
const CasesChart = lazy(() => import('./CasesChart'));

function ChartPlaceholder() {
  return <div aria-hidden="true" className="h-44 animate-pulse rounded-2xl bg-white/5" />;
}

function Highlight({ value, label, marker }: { value: string; label: string; marker: string }) {
  return (
    <div className="flex items-stretch gap-2.5">
      <span aria-hidden="true" className={cn('w-1.5 rounded-full', marker)} />
      <div>
        <p className="text-[2rem] font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-white/70">{label}</p>
      </div>
    </div>
  );
}

function Highlights({ trend }: { trend: CaseTrend }) {
  const { t, n, d, lang } = useLocale();
  const points = trend.points;
  if (trend.period === 'weekly') {
    const total = points.reduce((sum, p) => sum + p.cases, 0);
    const peak = points.reduce<CaseTrendPoint | undefined>(
      (best, p) => (!best || p.cases > best.cases ? p : best),
      undefined,
    );
    return (
      <>
        <Highlight value={n(total)} label={t('dashboard.cases.next7')} marker="bg-brand-lime" />
        {peak && (
          <Highlight
            value={n(peak.cases)}
            label={t('dashboard.cases.peakDay', { day: formatWeekday(peak.date, lang) })}
            marker="bg-brand-lavender"
          />
        )}
      </>
    );
  }
  const current = points[points.length - 1];
  const previous = points[points.length - 2];
  return (
    <>
      {current && (
        <Highlight
          value={n(current.cases)}
          label={t('dashboard.cases.thisMonth', { month: d(current.date, { month: 'long' }) })}
          marker="bg-brand-lime"
        />
      )}
      {previous && (
        <Highlight
          value={n(previous.cases)}
          label={t('dashboard.cases.lastMonth', { month: d(previous.date, { month: 'long' }) })}
          marker="bg-brand-lavender"
        />
      )}
    </>
  );
}

export function ForecastCasesCard({ className }: { className?: string }) {
  const { t, l } = useLocale();
  const [period, setPeriod] = useState<TrendPeriod>('weekly');
  const { divisionId } = useDivision();
  const query = useCaseTrend(divisionId, period);
  const division = useDivisions().data?.find((item) => item.divisionId === divisionId);

  return (
    <Card
      tone="dark"
      title={t('dashboard.cases.title')}
      icon={TrendingUp}
      className={className}
      actions={
        <div role="group" aria-label={t('dashboard.cases.period')} className="flex gap-1">
          {(['weekly', 'monthly'] as const).map((value) => (
            <Pill
              key={value}
              tone="dark"
              selected={period === value}
              onClick={() => setPeriod(value)}
            >
              {t(`dashboard.cases.${value}`)}
            </Pill>
          ))}
        </div>
      }
    >
      <QueryState
        query={query}
        onDark
        isEmpty={(trend) => trend.points.length === 0}
        skeleton={
          <div role="status" aria-label={t('common.loading')}>
            <div className="mb-5 flex gap-8">
              <div className="h-12 w-24 animate-pulse rounded-xl bg-white/5" />
              <div className="h-12 w-24 animate-pulse rounded-xl bg-white/5" />
            </div>
            <ChartPlaceholder />
          </div>
        }
        empty={
          <EmptyState
            icon={TrendingUp}
            title={t('dashboard.cases.emptyTitle')}
            message={<span className="text-white/70">{t('dashboard.cases.emptyMessage')}</span>}
          />
        }
      >
        {(trend) => (
          <>
            <div className="mb-5 flex flex-wrap gap-x-10 gap-y-4">
              <Highlights trend={trend} />
            </div>
            <Suspense fallback={<ChartPlaceholder />}>
              <CasesChart trend={trend} />
            </Suspense>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="lime">{t('common.simulatedData')}</Badge>
              {division && (
                <span className="text-xs text-white/70">
                  {t('dashboard.cases.caption', { division: l(division.name) })}
                </span>
              )}
            </div>
          </>
        )}
      </QueryState>
    </Card>
  );
}
