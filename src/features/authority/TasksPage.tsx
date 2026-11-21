import { useState } from 'react';
import {
  AlarmClock,
  Ban,
  CheckCircle2,
  Download,
  ListTodo,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useDivisions } from '@/api/queries';
import { useAuthorityReports, useMoveTask, useTasks } from '@/api/staffQueries';
import type { PreventionTask, PreventionTaskStatus, TaskColumn } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useCsvExport } from '@/components/useCsvExport';
import { useStaffError } from '@/components/useStaffError';
import { Badge, Button, EmptyState, SkeletonCard, SkeletonGroup, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { localDigits, toIsoDate } from '@/lib/format';
import { groupTasks, TASK_COLUMNS, taskColumn } from '@/lib/tasks';
import { useLocale } from '@/lib/useLocale';
import { TaskFormModal } from './TaskFormModal';

/** Buttons to move a task on, by its stored status. */
const MOVES: Record<PreventionTaskStatus, PreventionTaskStatus[]> = {
  open: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'open', 'cancelled'],
  completed: ['open'],
  cancelled: ['open'],
};

const MOVE_ICONS = {
  in_progress: Play,
  completed: CheckCircle2,
  cancelled: Ban,
  open: RotateCcw,
} as const;

/** Prevention task board: Open, In progress, Completed, Cancelled, Overdue (derived). */
export default function TasksPage() {
  const { t, l } = useLocale();
  const query = useTasks();
  const reports = useAuthorityReports();
  const divisions = useDivisions();
  const exportCsv = useCsvExport();
  const [creating, setCreating] = useState(false);
  const today = toIsoDate(new Date());

  const onExport = () => {
    const reference = (id: string | null) =>
      id ? (reports.data?.find((r) => r.reportId === id)?.reference ?? id) : '';
    exportCsv('prevention-tasks', query.data ?? [], [
      { header: t('staff.tasks.taskTitle'), value: (x) => x.title },
      { header: t('staff.tasks.area'), value: (x) => x.area },
      {
        header: t('staff.tasks.division'),
        value: (x) => {
          const division = divisions.data?.find((d) => d.divisionId === x.divisionId);
          return division ? l(division.name) : x.divisionId;
        },
      },
      { header: t('staff.tasks.team'), value: (x) => x.assignedTeam },
      { header: t('staff.tasks.dueDate'), value: (x) => x.dueDate },
      {
        header: t('staff.common.status'),
        value: (x) => t(`staff.tasks.columns.${taskColumn(x, today)}`),
      },
      { header: t('staff.tasks.linkedReport'), value: (x) => reference(x.linkedReportId) },
    ]);
  };

  return (
    <>
      <PageHeader
        title={t('staff.tasks.title')}
        subtitle={t('staff.tasks.subtitle')}
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={Download}
              disabled={!query.data?.length}
              onClick={onExport}
            >
              {t('staff.export.csv')}
            </Button>
            <Button size="sm" leadingIcon={Plus} onClick={() => setCreating(true)}>
              {t('staff.tasks.new')}
            </Button>
          </>
        }
      />
      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        isEmpty={(list) => list.length === 0}
        empty={
          <div className="rounded-3xl bg-white">
            <EmptyState
              icon={ListTodo}
              title={t('staff.tasks.emptyTitle')}
              message={t('staff.tasks.emptyMessage')}
            />
          </div>
        }
      >
        {(tasks) => {
          const groups = groupTasks(tasks, today);
          return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {TASK_COLUMNS.map((column) => (
                <Column key={column} column={column} tasks={groups[column]} />
              ))}
            </div>
          );
        }}
      </QueryState>
      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
    </>
  );
}

function Column({ column, tasks }: { column: TaskColumn; tasks: PreventionTask[] }) {
  const { t, n } = useLocale();
  const headingId = `col-${column}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-3xl p-4', column === 'overdue' ? 'bg-[#FBE3E4]' : 'bg-white')}
    >
      <h2 id={headingId} className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {column === 'overdue' && (
          <AlarmClock aria-hidden="true" className="h-4 w-4 text-[#B3262B]" />
        )}
        {t(`staff.tasks.columns.${column}`)}
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-lime px-1.5 text-xs">
          {n(tasks.length)}
        </span>
      </h2>
      {tasks.length === 0 ? (
        <p className="text-xs text-brand-muted">{t('staff.tasks.columnEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.taskId}>
              <TaskCard task={task} overdue={column === 'overdue'} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskCard({ task, overdue }: { task: PreventionTask; overdue: boolean }) {
  const { t, d, lang } = useLocale();
  const move = useMoveTask();
  const reports = useAuthorityReports();
  const toast = useToast();
  const showError = useStaffError();
  const [cancelling, setCancelling] = useState(false);
  const linked = task.linkedReportId
    ? reports.data?.find((r) => r.reportId === task.linkedReportId)
    : undefined;

  const go = (status: PreventionTaskStatus) =>
    move.mutate(
      { taskId: task.taskId, status },
      {
        onSuccess: () => {
          toast({
            tone: 'success',
            message: t('staff.tasks.moved', {
              title: task.title,
              column: t(`staff.tasks.columns.${status}`),
            }),
          });
          setCancelling(false);
        },
        onError: showError,
      },
    );

  return (
    <article aria-label={task.title} className="rounded-2xl bg-brand-canvas p-3 text-sm">
      <h3 className="font-semibold">{task.title}</h3>
      <p className="text-xs text-brand-muted">{task.area}</p>
      <p className="mt-1 text-xs">{task.assignedTeam}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={overdue ? 'risk-high' : 'neutral'} icon={overdue ? AlarmClock : undefined}>
          {t('staff.tasks.due', { date: d(task.dueDate, { day: 'numeric', month: 'short' }) })}
        </Badge>
        {overdue && <Badge tone="lavender">{t(`staff.tasks.columns.${task.status}`)}</Badge>}
        {linked && <Badge tone="lavender">{localDigits(linked.reference, lang)}</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MOVES[task.status].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === 'cancelled' ? 'ghost' : 'secondary'}
            leadingIcon={MOVE_ICONS[status]}
            loading={move.isPending && move.variables?.status === status}
            aria-label={t('staff.tasks.moveNamed', {
              title: task.title,
              action: t(`staff.tasks.moves.${status}`),
            })}
            onClick={() => (status === 'cancelled' ? setCancelling(true) : go(status))}
          >
            {t(`staff.tasks.moves.${status}`)}
          </Button>
        ))}
      </div>
      <ConfirmDialog
        open={cancelling}
        title={t('staff.tasks.cancelTitle')}
        message={t('staff.tasks.cancelBody', { title: task.title })}
        confirmLabel={t('staff.tasks.moves.cancelled')}
        loading={move.isPending}
        onClose={() => setCancelling(false)}
        onConfirm={() => go('cancelled')}
      />
    </article>
  );
}
