import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { List, Map as MapIcon, MousePointerClick, WifiOff } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDivisions, useLatestForecast } from '@/api/queries';
import type { DivisionId } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pill,
  Sheet,
  Skeleton,
  SkeletonGroup,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { useLocale } from '@/lib/useLocale';
import { DivisionDetail } from './DivisionDetail';
import { DivisionList } from './DivisionList';
import { buildDivisionRisks } from './riskUtils';

// Leaflet is loaded only on this page (NFR15).
const RiskMapView = lazy(() => import('./RiskMapView'));

type View = 'map' | 'list';
type Fallback = 'tiles' | 'offline' | null;

/** Map fills the screen above the bottom tab bar on mobile. */
const MAP_HEIGHT =
  '-mx-4 h-[calc(100dvh-19rem)] min-h-[22rem] md:mx-0 md:h-[37.5rem] md:min-h-0 md:rounded-3xl';

function MapSkeleton() {
  return (
    <SkeletonGroup className={cn(MAP_HEIGHT, 'overflow-hidden')}>
      <Skeleton shape="rect" className="h-full rounded-none md:rounded-3xl" />
    </SkeletonGroup>
  );
}

export default function RiskMapPage() {
  const { t, l } = useLocale();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const forecast = useLatestForecast();
  const divisions = useDivisions();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('map');
  const [fallback, setFallback] = useState<Fallback>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : null,
  );
  const [mapKey, setMapKey] = useState(0);

  // Going offline switches to the list automatically.
  useEffect(() => {
    const onOffline = () => setFallback('offline');
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, []);

  const effectiveView: View = fallback ? 'list' : view;

  const items =
    forecast.data && divisions.data ? buildDivisionRisks(forecast.data, divisions.data) : [];
  const selectedId = params.get('division') as DivisionId | null;
  const selected = items.find((item) => item.division.divisionId === selectedId) ?? null;

  const select = useCallback(
    (id: DivisionId) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('division', id);
        return next;
      }),
    [setParams],
  );
  const close = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('division');
      return next;
    });
  const onTilesFailed = useCallback(() => setFallback('tiles'), []);

  const chooseView = (next: View) => {
    if (next === 'map' && fallback) {
      setFallback(null);
      setMapKey((key) => key + 1);
    }
    setView(next);
  };

  const isPending = forecast.isPending || divisions.isPending;
  const isError = forecast.isError || divisions.isError;
  const retry = () => {
    void forecast.refetch();
    void divisions.refetch();
  };

  let content: React.ReactNode;
  if (isPending) {
    content = <MapSkeleton />;
  } else if (isError) {
    content = (
      <Card>
        <ErrorState onRetry={retry} retrying={forecast.isFetching || divisions.isFetching} />
      </Card>
    );
  } else if (items.length === 0) {
    content = (
      <Card>
        <EmptyState
          icon={MapIcon}
          title={t('riskMap.emptyTitle')}
          message={t('riskMap.emptyMessage')}
        />
      </Card>
    );
  } else if (effectiveView === 'map') {
    content = (
      <div className={cn(MAP_HEIGHT, 'relative z-0 overflow-hidden')}>
        <Suspense fallback={<Skeleton shape="rect" className="h-full rounded-none" />}>
          <RiskMapView
            key={mapKey}
            items={items}
            selectedId={selectedId}
            onSelect={select}
            onTilesFailed={onTilesFailed}
          />
        </Suspense>
      </div>
    );
  } else {
    content = <DivisionList items={items} selectedId={selectedId} onSelect={select} />;
  }

  const generatedAt = forecast.data?.generatedAt ?? new Date().toISOString();

  return (
    <>
      <PageHeader
        title={t('riskMap.title')}
        subtitle={t('riskMap.subtitle')}
        actions={
          <div role="group" aria-label={t('riskMap.viewLabel')} className="flex gap-1">
            <Pill
              leadingIcon={MapIcon}
              selected={effectiveView === 'map'}
              onClick={() => chooseView('map')}
            >
              {t('riskMap.viewMap')}
            </Pill>
            <Pill
              leadingIcon={List}
              selected={effectiveView === 'list'}
              onClick={() => chooseView('list')}
            >
              {t('riskMap.viewList')}
            </Pill>
          </div>
        }
      />

      {fallback && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
        >
          <WifiOff aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-muted" />
          <p className="min-w-0 flex-1">
            {fallback === 'offline' ? t('riskMap.offline') : t('riskMap.tilesFailed')}
          </p>
          <Button variant="secondary" size="sm" onClick={() => chooseView('map')}>
            {t('riskMap.retryMap')}
          </Button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0">{content}</div>

        {isDesktop && !isPending && !isError && items.length > 0 && (
          <aside aria-label={t('riskMap.panelLabel')} className="sticky top-4">
            <Card>
              {selected ? (
                <DivisionDetail
                  key={selected.division.divisionId}
                  item={selected}
                  generatedAt={generatedAt}
                />
              ) : (
                <EmptyState
                  icon={MousePointerClick}
                  title={t('riskMap.selectTitle')}
                  message={t('riskMap.selectMessage')}
                />
              )}
            </Card>
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet
          open={selected !== null}
          onClose={close}
          title={selected ? l(selected.division.name) : ''}
        >
          {selected && (
            <DivisionDetail item={selected} generatedAt={generatedAt} showTitle={false} />
          )}
        </Sheet>
      )}
    </>
  );
}
