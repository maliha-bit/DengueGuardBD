import { lazy, Suspense } from 'react';
import { CalendarCheck, ChartColumn, MapPinned, MessageSquare, Siren, Users } from 'lucide-react';
import { useAnalytics } from '@/api/staffQueries';
import type { DailyCount } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Badge, Card, EmptyState, SkeletonCard, SkeletonGroup, StatCard } from '@/components/ui';
import { formatWeekday } from '@/lib/format';
import { brandColors } from '@/lib/tokens';
import { useLocale } from '@/lib/useLocale';

const AnalyticsBarChart = lazy(() => import('./AnalyticsCharts'));

const sum = (list: DailyCount[]) => list.reduce((total, p) => total + p.count, 0);

/** Usage analytics (simulated): users, appointments, reports, chatbot, red flags. */
export default function AnalyticsPage() {
  const { t, lang } = useLocale();
  const query = useAnalytics();
  const daily = (list: DailyCount[]) =>
    list.map((p) => ({ label: formatWeekday(p.date, lang), value: p.count }));
  const placeholder = (
    <div aria-hidden="true" className="h-52 animate-pulse rounded-2xl bg-brand-canvas" />
  );

  return (
    <>
      <PageHeader
        title={t('staff.analytics.title')}
        subtitle={t('staff.analytics.subtitle')}
        actions={<Badge tone="lavender">{t('common.simulatedData')}</Badge>}
      />
      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        empty={
          <Card>
            <EmptyState icon={ChartColumn} title={t('staff.analytics.emptyTitle')} />
          </Card>
        }
      >
        {(data) => {
          const users = data.usersByRole.reduce((total, r) => total + r.count, 0);
          const openReports = data.reportsByStatus
            .filter((r) => r.status === 'submitted' || r.status === 'under_review')
            .reduce((total, r) => total + r.count, 0);
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title={t('staff.analytics.users')}
                  icon={Users}
                  value={users}
                  unit={t('staff.analytics.accounts')}
                />
                <StatCard
                  title={t('staff.analytics.appointments7')}
                  icon={CalendarCheck}
                  value={sum(data.appointmentsPerDay)}
                  unit={t('staff.analytics.last7')}
                />
                <StatCard
                  title={t('staff.analytics.openReports')}
                  icon={MapPinned}
                  value={openReports}
                  unit={t('staff.analytics.reportsUnit')}
                />
                <StatCard
                  tone="lavender"
                  title={t('staff.analytics.redFlags7')}
                  icon={Siren}
                  value={sum(data.redFlagAlertsPerDay)}
                  unit={t('staff.analytics.last7')}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Card title={t('staff.analytics.usersByRole')} icon={Users} titleAs="h2">
                  <Suspense fallback={placeholder}>
                    <AnalyticsBarChart
                      horizontal
                      title={t('staff.analytics.usersByRole')}
                      color={brandColors.lavender}
                      data={data.usersByRole.map((r) => ({
                        label: t(`roles.${r.role}`),
                        value: r.count,
                      }))}
                    />
                  </Suspense>
                </Card>
                <Card
                  tone="dark"
                  title={t('staff.analytics.appointmentsPerDay')}
                  icon={CalendarCheck}
                  titleAs="h2"
                >
                  <Suspense fallback={placeholder}>
                    <AnalyticsBarChart
                      onDark
                      title={t('staff.analytics.appointmentsPerDay')}
                      color={brandColors.lime}
                      data={daily(data.appointmentsPerDay)}
                    />
                  </Suspense>
                </Card>
                <Card title={t('staff.analytics.reportsByStatus')} icon={MapPinned} titleAs="h2">
                  <Suspense fallback={placeholder}>
                    <AnalyticsBarChart
                      horizontal
                      title={t('staff.analytics.reportsByStatus')}
                      color={brandColors.ink}
                      data={data.reportsByStatus.map((r) => ({
                        label: t(`reports.status.${r.status}`),
                        value: r.count,
                      }))}
                    />
                  </Suspense>
                </Card>
                <Card title={t('staff.analytics.chatPerDay')} icon={MessageSquare} titleAs="h2">
                  <Suspense fallback={placeholder}>
                    <AnalyticsBarChart
                      title={t('staff.analytics.chatPerDay')}
                      color={brandColors.lavender}
                      data={daily(data.chatQuestionsPerDay)}
                    />
                  </Suspense>
                </Card>
                <Card
                  title={t('staff.analytics.redFlagsPerDay')}
                  icon={Siren}
                  titleAs="h2"
                  className="md:col-span-2"
                >
                  <Suspense fallback={placeholder}>
                    <AnalyticsBarChart
                      title={t('staff.analytics.redFlagsPerDay')}
                      color={brandColors.ink}
                      data={daily(data.redFlagAlertsPerDay)}
                    />
                  </Suspense>
                </Card>
              </div>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
