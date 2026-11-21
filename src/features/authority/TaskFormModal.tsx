import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDivisions } from '@/api/queries';
import { useAuthorityReports, useCreateTask } from '@/api/staffQueries';
import type { DivisionId, PreventionTaskInput } from '@/api/types';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { toIsoDate } from '@/lib/format';
import { isoDateField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const taskSchema = z.object({
  title: z.string().trim().min(3, 'tooShort').max(120, 'tooLong'),
  area: z.string().trim().min(2, 'tooShort').max(120, 'tooLong'),
  divisionId: z.string().min(1, 'required'),
  assignedTeam: z.string().trim().min(2, 'tooShort').max(80, 'tooLong'),
  dueDate: isoDateField,
  linkedReportId: z.string(),
});
type TaskForm = z.infer<typeof taskSchema>;

/** New prevention task: title, area, team, due date and an optional linked report. */
export function TaskFormModal({
  defaults,
  onClose,
}: {
  defaults?: Partial<PreventionTaskInput>;
  onClose: () => void;
}) {
  const { t, l } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const create = useCreateTask();
  const divisions = useDivisions();
  const reports = useAuthorityReports();
  const inAWeek = new Date();
  inAWeek.setDate(inAWeek.getDate() + 7);
  const { register, handleSubmit, formState } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: defaults?.title ?? '',
      area: defaults?.area ?? '',
      divisionId: defaults?.divisionId ?? 'dhaka',
      assignedTeam: defaults?.assignedTeam ?? '',
      dueDate: defaults?.dueDate ?? toIsoDate(inAWeek),
      linkedReportId: defaults?.linkedReportId ?? '',
    },
  });
  const onSubmit = handleSubmit((values) =>
    create.mutate(
      {
        ...values,
        divisionId: values.divisionId as DivisionId,
        linkedReportId: values.linkedReportId || null,
      },
      {
        onSuccess: (task) => {
          toast({ tone: 'success', message: t('staff.tasks.created', { title: task.title }) });
          onClose();
        },
        onError: showError,
      },
    ),
  );
  const open = (reports.data ?? []).filter(
    (r) => r.status === 'submitted' || r.status === 'under_review',
  );

  return (
    <Modal open onClose={onClose} title={t('staff.tasks.newTitle')} size="lg">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label={t('staff.tasks.taskTitle')}
            {...register('title')}
            error={fieldError(formState.errors.title?.message)}
          />
        </div>
        <Input
          label={t('staff.tasks.area')}
          {...register('area')}
          error={fieldError(formState.errors.area?.message)}
        />
        <Select
          label={t('staff.tasks.division')}
          {...register('divisionId')}
          options={(divisions.data ?? []).map((d) => ({ value: d.divisionId, label: l(d.name) }))}
          error={fieldError(formState.errors.divisionId?.message)}
        />
        <Input
          label={t('staff.tasks.team')}
          {...register('assignedTeam')}
          error={fieldError(formState.errors.assignedTeam?.message)}
        />
        <Input
          type="date"
          label={t('staff.tasks.dueDate')}
          {...register('dueDate')}
          error={fieldError(formState.errors.dueDate?.message)}
        />
        <div className="md:col-span-2">
          <Select
            label={t('staff.tasks.linkedReport')}
            optional
            {...register('linkedReportId')}
            options={[
              { value: '', label: t('staff.tasks.noReport') },
              ...open.map((r) => ({ value: r.reportId, label: `${r.reference} · ${r.areaName}` })),
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={create.isPending}>
            {t('staff.tasks.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
