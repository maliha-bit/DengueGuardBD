import { CalendarRange } from 'lucide-react';
import { useDivisions, useLatestForecast } from '@/api/queries';
import type { RiskLevel } from '@/api/types';
import { QueryState } from '@/components/QueryState';
import { Card, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatWeekday } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { CardLink } from './CardLink';
import { outlookMatrix } from './forecastSummary';

/* Lavender shades by risk; size also grows with risk so colour is never the only cue. */
const dotClass: Record<RiskLevel, string> = {
  low: 'h-2.5 w-2.5 bg-brand-lavender-soft ring-1 ring-brand-lavender',
  medium: 'h-3.5 w-3.5 bg-brand-lavender',
  high: 'h-[18px] w-[18px] bg-[#6E56CF]',
};

const LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

export function OutlookCard({ className }: { className?: string }) {
  const { t, l, lang } = useLocale();
  const forecast = useLatestForecast();
  const divisions = useDivisions();

  return (
    <Card
      title={t('dashboard.outlook.title')}
      icon={CalendarRange}
      actions={<CardLink to="/risk" label={t('dashboard.outlook.open')} />}
      className={cn('flex flex-col', className)}
    >
      <QueryState
        query={forecast}
        isEmpty={(run) => run.forecasts.length === 0}
        skeleton={
          <SkeletonGroup className="grid grid-cols-8 gap-3">
            {Array.from({ length: 64 }, (_, i) => (
              <Skeleton key={i} shape="circle" className="h-3.5 w-3.5" />
            ))}
          </SkeletonGroup>
        }
        empty={
          <EmptyState
            icon={CalendarRange}
            title={t('dashboard.outlook.emptyTitle')}
            message={t('dashboard.outlook.emptyMessage')}
          />
        }
      >
        {(run) => {
          const rows = outlookMatrix(run, divisions.data ?? []);
          return (
            <div className="flex flex-1 flex-col">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-separate border-spacing-y-1.5">
                  <caption className="sr-only">{t('dashboard.outlook.caption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[30%] text-left">
                        <span className="sr-only">{t('dashboard.outlook.division')}</span>
                      </th>
                      {run.days.map((day, i) => (
                        <th
                          key={day}
                          scope="col"
                          className={cn(
                            'pb-1 text-center text-[11px] font-medium',
                            i === 0 ? 'text-brand-ink' : 'text-brand-muted',
                          )}
                        >
                          {i === 0 ? t('dashboard.outlook.today') : formatWeekday(day, lang)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ division, cells }) => (
                      <tr key={division.divisionId}>
                        <th
                          scope="row"
                          className="truncate pr-2 text-left text-xs font-medium text-brand-ink"
                        >
                          {l(division.name)}
                        </th>
                        {cells.map((cell, i) => (
                          <td key={run.days[i]} className="h-6 text-center">
                            {cell ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    'inline-block rounded-full align-middle',
                                    dotClass[cell.riskLevel],
                                  )}
                                />
                                <span className="sr-only">{t(`risk.${cell.riskLevel}`)}</span>
                              </>
                            ) : (
                              <span className="sr-only">{t('dashboard.outlook.noData')}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                aria-label={t('dashboard.outlook.legend')}
                className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-brand-muted"
              >
                {LEVELS.map((level) => (
                  <li key={level} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn('inline-block rounded-full', dotClass[level])}
                    />
                    {t(`risk.${level}`)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }}
      </QueryState>
    </Card>
  );
}
