import { lazy, Suspense, useMemo, useState } from 'react';
import { Download, Eye, MapPinned, SearchX } from 'lucide-react';
import { useDivisions } from '@/api/queries';
import { useAuthorityReports } from '@/api/staffQueries';
import type { AuthorityReport, BreedingReportStatus } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useCsvExport } from '@/components/useCsvExport';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  pageCount,
  paginate,
  Select,
  Skeleton,
  SkeletonCard,
} from '@/components/ui';
import { localDigits, toIsoDate } from '@/lib/format';
import { REPORT_STATUSES } from '@/lib/reports';
import { useLocale } from '@/lib/useLocale';
import { ReportDetailModal } from './ReportDetailModal';

const ReportsMapView = lazy(() => import('./ReportsMapView'));

interface Filters {
  division: string;
  district: string;
  status: string;
  from: string;
  to: string;
}
const EMPTY: Filters = { division: '', district: '', status: '', from: '', to: '' };

function filterReports(reports: AuthorityReport[], f: Filters): AuthorityReport[] {
  return reports.filter((r) => {
    const day = toIsoDate(new Date(r.createdAt));
    return (
      (!f.division || r.divisionId === f.division) &&
      (!f.district || r.districtId === f.district) &&
      (!f.status || r.status === f.status) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to)
    );
  });
}

/** Breeding reports: map + table with filters, open a report to review it, export CSV. */
export default function ReportsPage() {
  const { t, l, n, d, lang } = useLocale();
  const query = useAuthorityReports();
  const divisions = useDivisions();
  const exportCsv = useCsvExport();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const update = (changes: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...changes }));
    setPage(1);
  };

  const districtOptions = useMemo(
    () =>
      (divisions.data ?? [])
        .filter((div) => !filters.division || div.divisionId === filters.division)
        .flatMap((div) => div.districts.map((x) => ({ value: x.districtId, label: l(x.name) }))),
    [divisions.data, filters.division, l],
  );
  const filtered = filterReports(query.data ?? [], filters);
  const opened = query.data?.find((r) => r.reportId === openId) ?? null;
  const statusLabel = (s: BreedingReportStatus) => t(`reports.status.${s}`);

  const onExport = () =>
    exportCsv('breeding-reports', filtered, [
      { header: t('staff.reports.reference'), value: (r) => r.reference },
      { header: t('staff.reports.area'), value: (r) => r.areaName },
      {
        header: t('staff.reports.division'),
        value: (r) =>
          l(
            divisions.data?.find((x) => x.divisionId === r.divisionId)?.name ?? {
              en: r.divisionId,
              bn: r.divisionId,
            },
          ),
      },
      { header: t('staff.reports.district'), value: (r) => l(r.district) },
      { header: t('staff.reports.siteType'), value: (r) => t(`reports.siteTypes.${r.siteType}`) },
      { header: t('staff.common.status'), value: (r) => statusLabel(r.status) },
      { header: t('staff.reports.date'), value: (r) => r.createdAt },
      { header: t('staff.reports.latitude'), value: (r) => r.location[0] },
      { header: t('staff.reports.longitude'), value: (r) => r.location[1] },
    ]);

  return (
    <>
      <PageHeader
        title={t('staff.reports.title')}
        subtitle={t('staff.reports.subtitle')}
        actions={
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={Download}
            disabled={filtered.length === 0}
            onClick={onExport}
          >
            {t('staff.export.csv')}
          </Button>
        }
      />
      <Card className="mb-4">
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          role="group"
          aria-label={t('staff.reports.filters')}
        >
          <Select
            label={t('staff.reports.division')}
            value={filters.division}
            onChange={(e) => update({ division: e.target.value, district: '' })}
            options={[
              { value: '', label: t('staff.common.all') },
              ...(divisions.data ?? []).map((x) => ({ value: x.divisionId, label: l(x.name) })),
            ]}
          />
          <Select
            label={t('staff.reports.district')}
            value={filters.district}
            onChange={(e) => update({ district: e.target.value })}
            options={[{ value: '', label: t('staff.common.all') }, ...districtOptions]}
          />
          <Select
            label={t('staff.common.status')}
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            options={[
              { value: '', label: t('staff.common.all') },
              ...REPORT_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
            ]}
          />
          <Input
            type="date"
            label={t('staff.common.from')}
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
          />
          <Input
            type="date"
            label={t('staff.common.to')}
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
          />
        </div>
      </Card>

      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        isEmpty={(list) => list.length === 0}
        empty={
          <Card>
            <EmptyState icon={MapPinned} title={t('staff.reports.emptyTitle')} />
          </Card>
        }
      >
        {() =>
          filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title={t('staff.reports.noMatch')}
                action={
                  <Button size="sm" variant="secondary" onClick={() => update(EMPTY)}>
                    {t('hospitals.clearFilters')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr),minmax(0,3fr)] [&>*]:min-w-0">
              <Card className="h-80 overflow-hidden p-0 xl:h-auto xl:min-h-[420px]">
                <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
                  <ReportsMapView reports={filtered} onOpen={(r) => setOpenId(r.reportId)} />
                </Suspense>
              </Card>
              <Card
                title={t('staff.reports.tableTitle', { value: n(filtered.length) })}
                titleAs="h2"
              >
                <DataTable
                  caption={t('staff.reports.tableCaption')}
                  rows={paginate(filtered, page)}
                  rowKey={(r) => r.reportId}
                  columns={[
                    {
                      key: 'area',
                      header: t('staff.reports.area'),
                      primary: true,
                      cell: (r) => r.areaName,
                    },
                    {
                      key: 'reference',
                      header: t('staff.reports.reference'),
                      cell: (r) => localDigits(r.reference, lang),
                    },
                    {
                      key: 'district',
                      header: t('staff.reports.district'),
                      cell: (r) => l(r.district),
                    },
                    {
                      key: 'status',
                      header: t('staff.common.status'),
                      cell: (r) => (
                        <Badge
                          tone={
                            r.status === 'submitted'
                              ? 'lavender'
                              : r.status === 'rejected'
                                ? 'neutral'
                                : 'lime'
                          }
                        >
                          <span data-testid="authority-report-status">{statusLabel(r.status)}</span>
                        </Badge>
                      ),
                    },
                    {
                      key: 'date',
                      header: t('staff.reports.date'),
                      cell: (r) => d(r.createdAt, { day: 'numeric', month: 'short' }),
                    },
                  ]}
                  actions={(r) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={Eye}
                      aria-label={t('staff.reports.openNamed', { area: r.areaName })}
                      onClick={() => setOpenId(r.reportId)}
                    >
                      {t('staff.reports.open')}
                    </Button>
                  )}
                />
                <Pagination page={page} pages={pageCount(filtered.length)} onChange={setPage} />
              </Card>
            </div>
          )
        }
      </QueryState>
      {opened && (
        <ReportDetailModal key={opened.reportId} report={opened} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
