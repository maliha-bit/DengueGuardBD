import { useState } from 'react';
import { AlarmClock, ListTodo, MapPinned, Plus, ShieldAlert } from 'lucide-react';
import { useDivisions, useLatestForecast } from '@/api/queries';
import { useAuthorityReports, useTasks } from '@/api/staffQueries';
import type { PreventionTaskInput } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { RiskBadge } from '@/components/RiskBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import { Button, Card, EmptyState, SkeletonCard, SkeletonGroup, StatCard } from '@/components/ui';
import { buildDivisionRisks, sortByRisk } from '@/features/risk/riskUtils';
import { toIsoDate } from '@/lib/format';
import { isOverdue } from '@/lib/tasks';
import { useLocale } from '@/lib/useLocale';
import { TaskFormModal } from './TaskFormModal';

/** Authority home: today's key numbers and high-risk alerts with "Create task". */
export default function AuthorityOverviewPage() {
  const { t, l, n } = useLocale();
  const forecast = useLatestForecast();
  const divisions = useDivisions();
  const reports = useAuthorityReports();
  const tasks = useTasks();
  const [taskFor, setTaskFor] = useState<Partial<PreventionTaskInput> | null>(null);
  const today = toIsoDate(new Date());

  const risks =
    forecast.data && divisions.data
      ? sortByRisk(buildDivisionRisks(forecast.data, divisions.data))
      : [];
  const alerts = risks.filter((r) => r.today.riskLevel !== 'low');
  const high = risks.filter((r) => r.today.riskLevel === 'high').length;
  const newReports = reports.data?.filter((r) => r.status === 'submitted').length;
  const openTasks = tasks.data?.filter(
    (x) => x.status === 'open' || x.status === 'in_progress',
  ).length;
  const overdue = tasks.data?.filter((x) => isOverdue(x, today)).length;
  const dash = (value: number | undefined) => (value === undefined ? '–' : value);

  return (
    <>
      <PageHeader title={t('staff.authority.title')} subtitle={t('staff.authority.subtitle')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="dark"
          title={t('staff.authority.highRisk')}
          icon={ShieldAlert}
          value={forecast.isPending ? '–' : high}
          unit={t('staff.authority.divisions')}
        />
        <StatCard
          title={t('staff.authority.newReports')}
          icon={MapPinned}
          value={dash(newReports)}
          unit={t('staff.authority.toReview')}
        />
        <StatCard
          title={t('staff.authority.openTasks')}
          icon={ListTodo}
          value={dash(openTasks)}
          unit={t('staff.authority.tasksUnit')}
        />
        <StatCard
          tone="lavender"
          title={t('staff.authority.overdueTasks')}
          icon={AlarmClock}
          value={dash(overdue)}
          unit={t('staff.authority.tasksUnit')}
        />
      </div>

      <Card
        title={t('staff.authority.alertsTitle')}
        icon={ShieldAlert}
        titleAs="h2"
        className="mt-4"
      >
        <QueryState
          query={forecast}
          skeleton={
            <SkeletonGroup className="flex flex-col gap-2">
              <SkeletonCard />
            </SkeletonGroup>
          }
          isEmpty={() => alerts.length === 0}
          empty={
            <EmptyState
              icon={ShieldAlert}
              title={t('staff.authority.noAlertsTitle')}
              message={t('staff.authority.noAlertsMessage')}
            />
          }
        >
          {() => (
            <ul className="flex flex-col gap-2">
              {alerts.map((risk) => (
                <li
                  key={risk.division.divisionId}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-canvas px-4 py-3"
                >
                  <span className="min-w-[7rem] font-semibold">{l(risk.division.name)}</span>
                  <RiskBadge level={risk.today.riskLevel} size="sm" />
                  <TrendIndicator trend={risk.trend} />
                  <span className="text-sm text-brand-muted">
                    {t('staff.hospital.overview.forecastCases', {
                      value: n(risk.today.predictedCases),
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="dark"
                    leadingIcon={Plus}
                    className="ml-auto"
                    aria-label={t('staff.authority.createTaskFor', {
                      division: l(risk.division.name),
                    })}
                    onClick={() =>
                      setTaskFor({
                        divisionId: risk.division.divisionId,
                        area: l(risk.division.name),
                        title: t('staff.authority.defaultTaskTitle', {
                          division: l(risk.division.name),
                        }),
                      })
                    }
                  >
                    {t('staff.authority.createTask')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      {taskFor && <TaskFormModal defaults={taskFor} onClose={() => setTaskFor(null)} />}
    </>
  );
}
