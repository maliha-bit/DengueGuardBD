import { useCallback, useMemo } from 'react';
import { BedDouble, HeartPulse, Hospital, Search, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDivisions, useHospitals } from '@/api/queries';
import type { DivisionId } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pill,
  Select,
  SkeletonCard,
  SkeletonGroup,
} from '@/components/ui';
import { distanceKm } from '@/lib/geo';
import { useLocale } from '@/lib/useLocale';
import { HospitalCard } from './HospitalCard';
import {
  districtHasNoBeds,
  HOSPITAL_SORTS,
  matchesFilters,
  nearbyWithBeds,
  referencePoint,
  sortHospitals,
  type HospitalFilters,
  type HospitalSort,
} from './hospitalUtils';

/** Filters live in the URL so results can be shared and the back button works. */
function useHospitalFilters() {
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') as HospitalSort | null;
  const filters: HospitalFilters = {
    divisionId: (params.get('division') as DivisionId | null) || null,
    districtId: params.get('district') || null,
    icuOnly: params.get('icu') === '1',
    query: params.get('q') ?? '',
    sort: sort && HOSPITAL_SORTS.includes(sort) ? sort : 'beds',
  };
  const update = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { filters, update };
}

export default function HospitalsPage() {
  const { t, l, n } = useLocale();
  const { filters, update } = useHospitalFilters();
  const hospitals = useHospitals();
  const divisions = useDivisions();

  const division = divisions.data?.find((d) => d.divisionId === filters.divisionId);
  const district = division?.districts.find((d) => d.districtId === filters.districtId);
  const ref = referencePoint(filters, divisions.data ?? []);

  const { results, noBedsInfo, nearby } = useMemo(() => {
    const all = hospitals.data ?? [];
    const results = sortHospitals(
      all.filter((s) => matchesFilters(s, filters)),
      filters.sort,
      ref?.point ?? null,
      filters.icuOnly,
    );
    const noBedsInfo = districtHasNoBeds(all, filters);
    const nearby =
      noBedsInfo.noBeds && district ? nearbyWithBeds(all, district, filters.icuOnly) : [];
    return { results, noBedsInfo, nearby };
  }, [hospitals.data, filters, ref?.point, district]);

  const showDistance = filters.sort === 'nearest' && ref !== null;
  const clearFilters = () =>
    update({ division: null, district: null, icu: null, q: null, sort: null });

  let body: React.ReactNode;
  if (hospitals.isPending || divisions.isPending) {
    body = (
      <SkeletonGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-72" />
        ))}
      </SkeletonGroup>
    );
  } else if (hospitals.isError || divisions.isError) {
    body = (
      <Card>
        <ErrorState
          onRetry={() => {
            void hospitals.refetch();
            void divisions.refetch();
          }}
          retrying={hospitals.isFetching || divisions.isFetching}
        />
      </Card>
    );
  } else if (noBedsInfo.noBeds && district) {
    body = (
      <>
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-3xl bg-brand-ink-card p-5 text-white"
        >
          <BedDouble aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-lime" />
          <div>
            <p className="font-semibold">{t('hospitals.noBedsTitle')}</p>
            <p className="mt-1 text-sm text-white/75">
              {t('hospitals.noBedsMessage', { district: l(district.name) })}
            </p>
          </div>
        </div>
        <h2 className="mb-3 text-base font-semibold">{t('hospitals.nearbyTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nearby.map(({ summary, km }) => (
            <HospitalCard key={summary.hospital.hospitalId} summary={summary} distanceKm={km} />
          ))}
        </div>
        <h2 className="mb-3 mt-6 text-base font-semibold">
          {t('hospitals.inDistrict', { district: l(district.name) })}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {noBedsInfo.inDistrict.map((summary) => (
            <HospitalCard key={summary.hospital.hospitalId} summary={summary} />
          ))}
        </div>
      </>
    );
  } else if (results.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={SearchX}
          title={t('hospitals.emptyTitle')}
          message={t('hospitals.emptyMessage')}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {t('hospitals.clearFilters')}
            </Button>
          }
        />
      </Card>
    );
  } else {
    body = (
      <ul
        aria-label={t('hospitals.resultsLabel')}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {results.map((summary) => (
          <li key={summary.hospital.hospitalId} className="flex">
            <HospitalCard
              summary={summary}
              className="w-full"
              distanceKm={
                showDistance && ref ? distanceKm(ref.point, summary.hospital.location) : undefined
              }
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <PageHeader title={t('hospitals.title')} subtitle={t('hospitals.subtitle')} />

      <Card className="mb-4">
        <form
          role="search"
          aria-label={t('hospitals.filtersLabel')}
          onSubmit={(event) => event.preventDefault()}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]"
        >
          <Input
            label={t('hospitals.searchLabel')}
            placeholder={t('hospitals.searchPlaceholder')}
            leadingIcon={Search}
            type="search"
            value={filters.query}
            onChange={(event) => update({ q: event.target.value })}
          />
          <Select
            label={t('hospitals.division')}
            value={filters.divisionId ?? ''}
            onChange={(event) => update({ division: event.target.value, district: null })}
            options={[
              { value: '', label: t('hospitals.allDivisions') },
              ...(divisions.data ?? []).map((d) => ({ value: d.divisionId, label: l(d.name) })),
            ]}
          />
          <Select
            label={t('hospitals.district')}
            value={filters.districtId ?? ''}
            disabled={!division}
            hint={division ? undefined : t('hospitals.chooseDivisionFirst')}
            onChange={(event) => update({ district: event.target.value })}
            options={[
              { value: '', label: t('hospitals.allDistricts') },
              ...(division?.districts ?? []).map((d) => ({
                value: d.districtId,
                label: l(d.name),
              })),
            ]}
          />
          <Select
            label={t('hospitals.sort')}
            value={filters.sort}
            onChange={(event) =>
              update({ sort: event.target.value === 'beds' ? null : event.target.value })
            }
            options={HOSPITAL_SORTS.map((value) => ({
              value,
              label: t(`hospitals.sortBy.${value}`),
            }))}
          />
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
            <Pill
              leadingIcon={HeartPulse}
              selected={filters.icuOnly}
              onClick={() => update({ icu: filters.icuOnly ? null : '1' })}
            >
              {t('hospitals.icuOnly')}
            </Pill>
            {!hospitals.isPending && !hospitals.isError && (
              <p className="text-sm text-brand-muted" aria-live="polite">
                {t('hospitals.count', { count: results.length, total: n(results.length) })}
                {showDistance && ref && (
                  <> · {t('hospitals.distanceFrom', { place: l(ref.name) })}</>
                )}
              </p>
            )}
            <Badge tone="lavender" icon={Hospital} className="ml-auto">
              {t('common.simulatedData')}
            </Badge>
          </div>
        </form>
      </Card>

      {body}
    </>
  );
}
