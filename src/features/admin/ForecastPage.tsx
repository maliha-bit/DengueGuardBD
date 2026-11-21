import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import { useLatestForecast } from '@/api/queries';
import { useForecastJobs, useStartForecastRun } from '@/api/staffQueries';
import type { ForecastJob, ForecastJobStatus } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useStaffError } from '@/components/useStaffError';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  SkeletonCard,
  useToast,
  type BadgeTone,
} from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

const STATUS: Record<ForecastJobStatus, { tone: BadgeTone; icon: typeof Activity }> = {
  running: { tone: 'lavender', icon: Loader2 },
  succeeded: { tone: 'lime', icon: CheckCircle2 },
  failed: { tone: 'risk-high', icon: XCircle },
};

/** "Run forecast now" (mock job with progress) and the last 5 runs. */
export default function ForecastPage() {
  const { t, n, d } = useLocale();
  const queryClient = useQueryClient();
  const jobs = useForecastJobs();
  const forecast = useLatestForecast();
  const start = useStartForecastRun();
  const toast = useToast();
  const showError = useStaffError();
  const running = jobs.data?.find((j) => j.status === 'running');

  // When a run finishes, every "last updated" label (dashboard, risk map, …) refreshes.
  const watching = useRef<string | null>(null);
  const latest = jobs.data?.[0];
  useEffect(() => {
    if (running) {
      watching.current = running.jobId;
      return;
    }
    if (watching.current && latest?.jobId === watching.current && latest.status === 'succeeded') {
      watching.current = null;
      void queryClient.invalidateQueries({ queryKey: ['forecast'] });
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({ tone: 'success', message: t('staff.forecast.finished') });
    }
  }, [running, latest, queryClient, t, toast]);

  const run = () =>
    start.mutate(undefined, {
      onSuccess: (job) => {
        watching.current = job.jobId;
        if (job.status === 'succeeded') {
          void queryClient.invalidateQueries({ queryKey: ['forecast'] });
        }
      },
      onError: showError,
    });

  const progress = Math.round((running?.progress ?? 0) * 100);

  return (
    <>
      <PageHeader title={t('staff.forecast.title')} subtitle={t('staff.forecast.subtitle')} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card tone="dark" title={t('staff.forecast.runTitle')} icon={Activity} titleAs="h2">
          {forecast.data && (
            <Freshness
              onDark
              stale={false}
              updatedAt={forecast.data.generatedAt}
              text={(time) => t('staff.forecast.lastUpdated', { time })}
            />
          )}
          {forecast.data && (
            <p className="mt-1 text-xs text-white/70" data-testid="forecast-generated-at">
              {d(forecast.data.generatedAt, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}
          {running ? (
            <div className="mt-5">
              <p className="text-sm">{t('staff.forecast.running', { value: n(progress) })}</p>
              <div
                role="progressbar"
                aria-label={t('staff.forecast.progress')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-brand-lime transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <Button className="mt-5" leadingIcon={Play} loading={start.isPending} onClick={run}>
              {t('staff.forecast.runNow')}
            </Button>
          )}
          <p className="mt-4 text-xs text-white/70">{t('staff.forecast.hint')}</p>
        </Card>
        <Card title={t('staff.forecast.historyTitle')} titleAs="h2">
          <QueryState
            query={jobs}
            skeleton={<SkeletonCard />}
            isEmpty={(list) => list.length === 0}
            empty={<EmptyState compact title={t('staff.forecast.emptyTitle')} />}
          >
            {(list) => (
              <DataTable<ForecastJob>
                caption={t('staff.forecast.historyTitle')}
                rows={list}
                rowKey={(j) => j.jobId}
                columns={[
                  {
                    key: 'started',
                    header: t('staff.forecast.started'),
                    primary: true,
                    cell: (j) =>
                      d(j.startedAt, {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      }),
                  },
                  {
                    key: 'status',
                    header: t('staff.common.status'),
                    cell: (j) => (
                      <Badge tone={STATUS[j.status].tone} icon={STATUS[j.status].icon}>
                        {t(`staff.forecast.status.${j.status}`)}
                      </Badge>
                    ),
                  },
                  {
                    key: 'by',
                    header: t('staff.forecast.triggeredBy'),
                    cell: (j) =>
                      j.triggeredBy === 'Scheduler' ? t('staff.forecast.scheduler') : j.triggeredBy,
                  },
                ]}
              />
            )}
          </QueryState>
        </Card>
      </div>
    </>
  );
}
