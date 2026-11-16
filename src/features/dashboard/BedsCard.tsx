import { BedDouble } from 'lucide-react';
import { useBedSummary, useDivisions } from '@/api/queries';
import { useDivision } from '@/app/division';
import { Freshness } from '@/components/Freshness';
import { QueryState } from '@/components/QueryState';
import { Card, EmptyState, Skeleton, SkeletonGroup, StatValue } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { CardLink } from './CardLink';

export function BedsCard({ className }: { className?: string }) {
  const { t, l, n } = useLocale();
  const { divisionId } = useDivision();
  const query = useBedSummary(divisionId);
  const divisions = useDivisions();
  const division = divisions.data?.find((d) => d.divisionId === divisionId);
  const divisionName = division ? l(division.name) : '';

  return (
    <Card
      title={t('dashboard.beds.title')}
      icon={BedDouble}
      actions={<CardLink to="/hospitals" label={t('dashboard.beds.open')} />}
      className={cn('flex flex-col', className)}
    >
      <QueryState
        query={query}
        compact
        skeleton={
          <SkeletonGroup className="flex flex-col gap-3">
            <Skeleton shape="rect" className="h-10 w-1/2" />
            <Skeleton shape="text" className="w-2/3" />
          </SkeletonGroup>
        }
        empty={
          <EmptyState
            compact
            icon={BedDouble}
            title={t('dashboard.beds.emptyTitle')}
            message={t('dashboard.beds.emptyMessage', { division: divisionName })}
          />
        }
      >
        {(summary) => (
          <div className="flex flex-1 flex-col">
            <StatValue
              value={summary.generalAvailable}
              unit={t('dashboard.beds.unit', { division: divisionName })}
              aside={
                <>
                  <span className="block">{t('dashboard.beds.icu')}</span>
                  <span className="text-base font-semibold text-brand-ink">
                    {n(summary.icuAvailable)}
                  </span>
                </>
              }
            />
            <p className="mt-2 text-xs text-brand-muted">
              {t('dashboard.beds.hospitals', { count: n(summary.hospitalCount) })}
            </p>
            <Freshness updatedAt={summary.updatedAt} className="mt-auto pt-4" />
          </div>
        )}
      </QueryState>
    </Card>
  );
}
