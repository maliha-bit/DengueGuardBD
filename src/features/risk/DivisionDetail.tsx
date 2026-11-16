import {
  CloudRain,
  Droplets,
  Hospital,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDivisionDrivers } from '@/api/queries';
import type { DriverFactor, DriverUnit, ForecastDriver } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { QueryState } from '@/components/QueryState';
import { RiskBadge } from '@/components/RiskBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import {
  Badge,
  buttonClasses,
  EmptyState,
  IconChip,
  Skeleton,
  SkeletonGroup,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatWeekday } from '@/lib/format';
import { riskMeta } from '@/lib/risk';
import { useLocale } from '@/lib/useLocale';
import { AlertsButton } from './AlertsButton';
import { isForecastStale, type DivisionRisk } from './riskUtils';

const DRIVER_ICONS: Record<DriverFactor, LucideIcon> = {
  rainfall: CloudRain,
  humidity: Droplets,
  temperature: Thermometer,
  sunshine: Sun,
};

function DriverRow({ driver }: { driver: ForecastDriver }) {
  const { t, n } = useLocale();
  const units: Record<DriverUnit, string> = {
    mm: t('riskMap.units.mm'),
    percent: '%',
    celsius: '°C',
    hours: t('riskMap.units.hours'),
  };
  const raises = driver.direction === 'raises';
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-brand-canvas p-3">
      <IconChip icon={DRIVER_ICONS[driver.factor]} tone="lavender" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t(`riskMap.drivers.${driver.factor}`)}</p>
        <p className="text-xs text-brand-muted">
          {n(driver.value, { maximumFractionDigits: 1 })} {units[driver.unit]}
        </p>
      </div>
      <Badge
        tone={raises ? 'lavender' : 'neutral'}
        icon={raises ? TrendingUp : TrendingDown}
        className={raises ? '' : 'bg-white'}
      >
        {t(raises ? 'riskMap.impact.raises' : 'riskMap.impact.lowers')} ·{' '}
        {t(`riskMap.weight.${driver.weight}`)}
      </Badge>
    </li>
  );
}

/** Division detail: risk, trend, 7-day cards, drivers, freshness and actions. */
export function DivisionDetail({
  item,
  generatedAt,
  showTitle = true,
}: {
  item: DivisionRisk;
  generatedAt: string;
  showTitle?: boolean;
}) {
  const { t, l, n, lang } = useLocale();
  const { division, today, days, trend } = item;
  const name = l(division.name);
  const drivers = useDivisionDrivers(division.divisionId);
  const stale = isForecastStale(generatedAt);

  return (
    <div className="flex flex-col gap-5">
      <div>
        {showTitle && <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>}
        <div className={cn('flex flex-wrap items-center gap-2', showTitle && 'mt-2')}>
          <RiskBadge level={today.riskLevel} />
          <TrendIndicator trend={trend} />
        </div>
        <p className="mt-2 text-sm text-brand-muted">
          {t('riskMap.todayCases', { count: n(today.predictedCases) })}
        </p>
      </div>

      <section aria-labelledby={`outlook-${division.divisionId}`}>
        <h3 id={`outlook-${division.divisionId}`} className="mb-2 text-sm font-semibold">
          {t('riskMap.outlook')}
        </h3>
        <ol className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {days.map((day, i) => {
            const meta = riskMeta(day.riskLevel);
            const Icon = meta.icon;
            return (
              <li
                key={day.targetDate}
                className="flex min-w-[4.5rem] snap-start flex-col items-center gap-1 rounded-2xl bg-brand-canvas px-2 py-2.5 text-center"
              >
                <span className="text-[11px] font-medium text-brand-muted">
                  {i === 0 ? t('dashboard.outlook.today') : formatWeekday(day.targetDate, lang)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-brand-ink"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <span className="text-base font-semibold leading-none">
                  {n(day.predictedCases)}
                </span>
                <span className="text-[11px] leading-tight">
                  {t(`riskMap.short.${day.riskLevel}`)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby={`drivers-${division.divisionId}`}>
        <h3 id={`drivers-${division.divisionId}`} className="mb-2 text-sm font-semibold">
          {t('riskMap.driversTitle')}
        </h3>
        <QueryState
          query={drivers}
          compact
          isEmpty={(data) => data.drivers.length === 0}
          skeleton={
            <SkeletonGroup className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} shape="rect" className="h-14" />
              ))}
            </SkeletonGroup>
          }
          empty={
            <EmptyState
              compact
              icon={CloudRain}
              title={t('riskMap.driversEmptyTitle')}
              message={t('riskMap.driversEmptyMessage')}
            />
          }
        >
          {(data) => (
            <ul className="flex flex-col gap-2">
              {data.drivers.map((driver) => (
                <DriverRow key={driver.factor} driver={driver} />
              ))}
            </ul>
          )}
        </QueryState>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Freshness
          updatedAt={generatedAt}
          stale={stale}
          text={(time) => t('riskMap.updated', { time })}
          staleText={t('riskMap.outOfDate')}
        />
        <Badge tone="lavender">{t('common.simulatedData')}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Link
          to={`/hospitals?division=${division.divisionId}`}
          className={buttonClasses({ fullWidth: true })}
        >
          <Hospital aria-hidden="true" className="h-4 w-4" />
          {t('riskMap.findHospitals')}
        </Link>
        <AlertsButton divisionId={division.divisionId} divisionName={name} />
      </div>
    </div>
  );
}
