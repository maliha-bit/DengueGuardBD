import { ImageOff, MapPin, MapPinPlus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyBreedingReports } from '@/api/queries';
import type { BreedingReport } from '@/api/types';
import { RequireLogin } from '@/app/RequireLogin';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { StatusTimeline } from '@/components/StatusTimeline';
import {
  Badge,
  buttonClasses,
  Card,
  EmptyState,
  SkeletonCard,
  SkeletonGroup,
} from '@/components/ui';
import { localDigits } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { reportTimeline } from './reportUtils';

/** The user's breeding-site reports with status timelines. */
export default function MyReportsPage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('reports.list.title')} message={t('reports.loginMessage')}>
      <MyReports />
    </RequireLogin>
  );
}

const newReportLink = (label: string, size: 'sm' | 'md' = 'md') => (
  <Link to="/reports/new" className={buttonClasses({ size })}>
    <Plus aria-hidden="true" className="h-4 w-4" />
    {label}
  </Link>
);

function MyReports() {
  const { t } = useLocale();
  const query = useMyBreedingReports();
  return (
    <>
      <PageHeader
        title={t('reports.list.title')}
        subtitle={t('reports.list.subtitle')}
        actions={newReportLink(t('reports.list.new'), 'sm')}
      />
      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        isEmpty={(list) => list.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={MapPinPlus}
              title={t('reports.list.emptyTitle')}
              message={t('reports.list.emptyMessage')}
              action={newReportLink(t('reports.list.new'), 'sm')}
            />
          </Card>
        }
      >
        {(list) => (
          <ul className="grid gap-4">
            {list.map((report) => (
              <li key={report.reportId}>
                <ReportCard report={report} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}

function ReportCard({ report }: { report: BreedingReport }) {
  const { t, n, d, lang } = useLocale();
  const when = (iso: string) => d(iso, { day: 'numeric', month: 'short', year: 'numeric' });
  const steps = reportTimeline(
    report.status,
    {
      submitted: t('reports.status.submitted'),
      under_review: t('reports.status.under_review'),
      action_taken: t('reports.status.action_taken'),
      rejected: t('reports.status.rejected'),
      outcome: t('reports.status.outcome'),
    },
    { createdAt: when(report.createdAt), updatedAt: when(report.updatedAt) },
  );

  return (
    <article
      aria-label={report.areaName}
      className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:flex-row"
    >
      {report.photoUrl ? (
        <img
          src={report.photoUrl}
          alt={t('reports.list.photoAlt', { area: report.areaName })}
          className="h-28 w-full shrink-0 rounded-2xl object-cover sm:w-36"
        />
      ) : (
        <span className="flex h-28 w-full shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-brand-canvas text-xs text-brand-muted sm:w-36">
          <ImageOff aria-hidden="true" className="h-6 w-6" />
          {t('reports.list.noPhoto')}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{report.areaName}</h2>
          <Badge tone="lavender">{t(`reports.siteTypes.${report.siteType}`)}</Badge>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-muted">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {n(report.location[0], { maximumFractionDigits: 4 })},{' '}
          {n(report.location[1], { maximumFractionDigits: 4 })}
        </p>
        <p className="text-sm text-brand-muted">
          {t('reports.list.meta', {
            date: when(report.createdAt),
            reference: localDigits(report.reference, lang),
          })}
        </p>
        <div className="mt-3">
          <StatusTimeline
            steps={steps}
            label={t('reports.list.timelineLabel')}
            stateLabels={{
              done: t('timeline.done'),
              current: t('timeline.current'),
              upcoming: t('timeline.upcoming'),
              failed: t('timeline.failed'),
            }}
          />
        </div>
      </div>
    </article>
  );
}
