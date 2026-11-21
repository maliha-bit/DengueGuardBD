import { lazy, Suspense, useMemo, useState } from 'react';
import {
  Clock,
  FlaskConical,
  Home,
  Info,
  List,
  Map as MapIcon,
  Navigation,
  Phone,
  SearchX,
} from 'lucide-react';
import { useDivisions, useLabs } from '@/api/queries';
import type { Lab } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Pill,
  Select,
  Skeleton,
  SkeletonCard,
  SkeletonGroup,
} from '@/components/ui';
import { HospitalTypeBadge } from '@/features/hospitals/HospitalCard';
import { localDigits } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { useLocale } from '@/lib/useLocale';
import {
  EMPTY_LAB_FILTERS,
  filterLabs,
  isOpenNow,
  LAB_TESTS,
  priceRange,
  type LabFilters,
} from './labUtils';

// Leaflet loads only when the map view is opened.
const LabsMapView = lazy(() => import('./LabsMapView'));

/** Lab search (UC20 labs part): filters, map or list, prices as reported by labs. */
export default function LabsPage() {
  const { t, l, n } = useLocale();
  const query = useLabs();
  const divisions = useDivisions();
  const [filters, setFilters] = useState<LabFilters>(EMPTY_LAB_FILTERS);
  const [view, setView] = useState<'list' | 'map'>('list');
  const update = (changes: Partial<LabFilters>) => setFilters((f) => ({ ...f, ...changes }));

  const districtOptions = useMemo(
    () =>
      (divisions.data ?? []).flatMap((div) =>
        div.districts.map((d) => ({ value: d.districtId, label: `${l(d.name)} (${l(div.name)})` })),
      ),
    [divisions.data, l],
  );

  return (
    <>
      <PageHeader
        title={t('labs.title')}
        subtitle={t('labs.subtitle')}
        actions={
          <div role="group" aria-label={t('riskMap.viewLabel')} className="flex gap-1">
            <Pill selected={view === 'list'} leadingIcon={List} onClick={() => setView('list')}>
              {t('riskMap.viewList')}
            </Pill>
            <Pill selected={view === 'map'} leadingIcon={MapIcon} onClick={() => setView('map')}>
              {t('riskMap.viewMap')}
            </Pill>
          </div>
        }
      />

      <Card tone="lavender" className="mb-4">
        <p className="flex items-start gap-3 text-sm">
          <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="block font-semibold">{t('labs.guideTitle')}</span>
            {t('labs.guide')}
          </span>
        </p>
      </Card>

      <Card className="mb-4">
        <form
          aria-label={t('labs.filtersLabel')}
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t('labs.district')}
              value={filters.districtId}
              onChange={(e) => update({ districtId: e.target.value })}
              options={[{ value: '', label: t('hospitals.allDistricts') }, ...districtOptions]}
            />
            <Select
              label={t('labs.test')}
              value={filters.test}
              onChange={(e) => update({ test: e.target.value as LabFilters['test'] })}
              options={[
                { value: '', label: t('labs.anyTest') },
                ...LAB_TESTS.map((code) => ({ value: code, label: t(`chatbot.tests.${code}`) })),
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill
              selected={filters.homeCollection}
              leadingIcon={Home}
              onClick={() => update({ homeCollection: !filters.homeCollection })}
            >
              {t('labs.homeCollection')}
            </Pill>
            <Pill
              selected={filters.openNow}
              leadingIcon={Clock}
              onClick={() => update({ openNow: !filters.openNow })}
            >
              {t('labs.openNow')}
            </Pill>
          </div>
        </form>
      </Card>

      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        isEmpty={(all) => all.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={FlaskConical}
              title={t('labs.emptyTitle')}
              message={t('labs.emptyMessage')}
            />
          </Card>
        }
      >
        {(all) => {
          const results = filterLabs(all, filters);
          if (results.length === 0) {
            return (
              <Card>
                <EmptyState
                  icon={SearchX}
                  title={t('labs.noMatchTitle')}
                  message={t('labs.noMatchMessage')}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setFilters(EMPTY_LAB_FILTERS)}
                    >
                      {t('hospitals.clearFilters')}
                    </Button>
                  }
                />
              </Card>
            );
          }
          return (
            <section aria-label={t('labs.resultsLabel')}>
              <p className="mb-3 text-sm text-brand-muted" aria-live="polite">
                {t('labs.count', { count: results.length, total: n(results.length) })}
              </p>
              {view === 'map' && (
                <div className="mb-4 h-[24rem] overflow-hidden rounded-3xl">
                  <Suspense
                    fallback={
                      <SkeletonGroup className="h-full">
                        <Skeleton shape="rect" className="h-full" />
                      </SkeletonGroup>
                    }
                  >
                    <LabsMapView labs={results} />
                  </Suspense>
                </div>
              )}
              <ul className="grid gap-4 md:grid-cols-2">
                {results.map((lab) => (
                  <li key={lab.labId}>
                    <LabCard lab={lab} />
                  </li>
                ))}
              </ul>
            </section>
          );
        }}
      </QueryState>
    </>
  );
}

function LabCard({ lab }: { lab: Lab }) {
  const { t, l, n, lang } = useLocale();
  const name = l(lab.name);
  const open = isOpenNow(lab);
  const hours = lab.openingHours
    ? `${localDigits(lab.openingHours.opens, lang)}–${localDigits(lab.openingHours.closes, lang)}`
    : t('labs.open24');

  return (
    <article aria-label={name} className="flex h-full flex-col rounded-3xl bg-white p-5">
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold">{name}</h2>
        <HospitalTypeBadge type={lab.type} />
      </div>
      <p className="text-sm text-brand-muted">{l(lab.address)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={open ? 'lime' : 'neutral'} icon={Clock}>
          {open ? t('labs.openBadge') : t('labs.closedBadge')}
        </Badge>
        <span className="text-brand-muted">{t('labs.hours', { hours })}</span>
        {lab.homeCollection && (
          <Badge tone="lavender" icon={Home}>
            {t('labs.homeCollection')}
          </Badge>
        )}
      </div>

      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">{t('labs.testsCaption', { name })}</caption>
        <thead>
          <tr className="text-left text-xs text-brand-muted">
            <th scope="col" className="pb-1 font-medium">
              {t('labs.test')}
            </th>
            <th scope="col" className="pb-1 text-right font-medium">
              {t('labs.price')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lab.tests.map((test) => {
            const [min, max] = priceRange(test);
            return (
              <tr key={test.testId} className="border-t border-brand-line">
                <td className="py-1.5">{t(`chatbot.tests.${test.code}`)}</td>
                <td className="py-1.5 text-right font-medium">
                  {min === max
                    ? t('labs.priceOne', { price: n(min) })
                    : t('labs.priceRange', { min: n(min), max: n(max) })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-brand-muted">{t('labs.asReported')}</p>

      <Freshness
        className="mt-3"
        updatedAt={lab.updatedAt}
        stale={false}
        text={(time) => t('labs.updated', { time })}
      />

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <a
          href={`tel:${lab.phone}`}
          aria-label={t('hospitals.callLabel', { name })}
          className={buttonClasses({ variant: 'dark', size: 'sm' })}
        >
          <Phone aria-hidden="true" className="h-4 w-4" />
          {t('hospitals.call')}
        </a>
        <a
          href={directionsUrl(lab.location)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('hospitals.directionsLabel', { name })}
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          <Navigation aria-hidden="true" className="h-4 w-4" />
          {t('hospitals.directions')}
        </a>
      </div>
    </article>
  );
}
