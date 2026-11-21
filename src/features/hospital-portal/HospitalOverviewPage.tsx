import { lazy, Suspense } from 'react';
import { BedDouble, ClipboardList, HeartPulse, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCaseTrend, useDivisions, useLatestForecast } from '@/api/queries';
import { useHospitalAppointments, useStaffHospital } from '@/api/staffQueries';
import type { DivisionId } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { RiskBadge } from '@/components/RiskBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import {
  Badge,
  buttonClasses,
  Card,
  EmptyState,
  SkeletonCard,
  SkeletonGroup,
  StatCard,
} from '@/components/ui';
import { buildDivisionRisks } from '@/features/risk/riskUtils';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

const CasesChart = lazy(() => import('@/features/dashboard/CasesChart'));

/** Hospital staff home: beds, today's appointments and the division forecast for planning. */
export default function HospitalOverviewPage() {
  const { t, l, n } = useLocale();
  const query = useStaffHospital();
  const appointments = useHospitalAppointments();

  return (
    <>
      <PageHeader
        title={t('staff.hospital.overview.title')}
        subtitle={query.data ? l(query.data.hospital.name) : t('staff.hospital.overview.subtitle')}
      />
      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        empty={
          <Card>
            <EmptyState title={t('staff.hospital.notFound')} />
          </Card>
        }
      >
        {({ hospital, beds }) => {
          const booked = appointments.data?.filter((a) => a.status === 'booked').length ?? 0;
          const total = appointments.data?.length ?? 0;
          return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title={t('staff.hospital.overview.generalBeds')}
                icon={BedDouble}
                value={beds.generalAvailable}
                unit={t('staff.hospital.overview.ofTotal', { total: n(beds.generalTotal) })}
                caption={<Freshness updatedAt={beds.updatedAt} />}
              >
                <Link
                  to="/staff/hospital/beds"
                  className={cn(buttonClasses({ size: 'sm' }), 'mt-4')}
                >
                  {t('staff.hospital.overview.updateBeds')}
                </Link>
              </StatCard>
              <StatCard
                title={t('staff.hospital.overview.icuBeds')}
                icon={HeartPulse}
                value={beds.icuAvailable}
                unit={t('staff.hospital.overview.ofTotal', { total: n(beds.icuTotal) })}
                caption={<Freshness updatedAt={beds.updatedAt} />}
              />
              <StatCard
                tone="lavender"
                title={t('staff.hospital.overview.todayAppointments')}
                icon={ClipboardList}
                value={appointments.isPending ? '–' : booked}
                unit={t('staff.hospital.overview.waiting', { total: n(total) })}
              >
                <Link
                  to="/staff/hospital/appointments"
                  className={cn(buttonClasses({ variant: 'dark', size: 'sm' }), 'mt-4')}
                >
                  {t('staff.hospital.overview.openAppointments')}
                </Link>
              </StatCard>
              <DivisionForecastCard
                divisionId={hospital.divisionId}
                className="md:col-span-2 xl:col-span-3"
              />
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

/** Division risk today + 7-day case outlook (dark chart card), for bed planning. */
export function DivisionForecastCard({
  divisionId,
  className,
}: {
  divisionId: DivisionId;
  className?: string;
}) {
  const { t, l, n } = useLocale();
  const forecast = useLatestForecast();
  const divisions = useDivisions();
  const trend = useCaseTrend(divisionId, 'weekly');
  const risk =
    forecast.data && divisions.data
      ? buildDivisionRisks(forecast.data, divisions.data).find(
          (r) => r.division.divisionId === divisionId,
        )
      : undefined;

  return (
    <Card
      tone="dark"
      title={t('staff.hospital.overview.forecastTitle', {
        division: risk ? l(risk.division.name) : '',
      })}
      icon={TrendingUp}
      className={className}
    >
      <QueryState
        query={trend}
        onDark
        isEmpty={(data) => data.points.length === 0}
        skeleton={<div className="h-44 animate-pulse rounded-2xl bg-white/5" />}
        empty={<EmptyState icon={TrendingUp} title={t('dashboard.cases.emptyTitle')} />}
      >
        {(data) => (
          <>
            {risk && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <RiskBadge level={risk.today.riskLevel} />
                <TrendIndicator trend={risk.trend} />
                <span className="text-sm text-white/70">
                  {t('staff.hospital.overview.forecastCases', {
                    value: n(risk.today.predictedCases),
                  })}
                </span>
              </div>
            )}
            <Suspense fallback={<div className="h-44 animate-pulse rounded-2xl bg-white/5" />}>
              <CasesChart trend={data} />
            </Suspense>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="lime">{t('common.simulatedData')}</Badge>
              {forecast.data && (
                <Freshness updatedAt={forecast.data.generatedAt} stale={false} onDark />
              )}
            </div>
          </>
        )}
      </QueryState>
    </Card>
  );
}
