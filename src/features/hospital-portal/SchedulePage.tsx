import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Plus, Save, X } from 'lucide-react';
import { useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { useSaveSchedule, useStaffDoctors } from '@/api/staffQueries';
import type { StaffDoctor, Weekday } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useStaffError } from '@/components/useStaffError';
import { Button, Card, EmptyState, Select, SkeletonCard, useToast } from '@/components/ui';
import { weekdayName } from '@/lib/format';
import { hasInvalidRanges, WEEK_ORDER } from '@/lib/slots';
import { timeField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const scheduleSchema = z.object({
  days: z.array(
    z
      .object({
        day: z.number(),
        ranges: z.array(z.object({ start: timeField, end: timeField })),
      })
      .refine((d) => !hasInvalidRanges(d.ranges), { message: 'timeOrder', path: ['ranges'] }),
  ),
});
type ScheduleForm = z.infer<typeof scheduleSchema>;

function toForm(doctor: StaffDoctor): ScheduleForm {
  return {
    days: WEEK_ORDER.map((day) => ({
      day,
      ranges: doctor.schedule.find((s) => s.day === day)?.ranges.map((r) => ({ ...r })) ?? [],
    })),
  };
}

/** Weekly schedule per doctor: days and time ranges. */
export default function SchedulePage() {
  const { t, l } = useLocale();
  const query = useStaffDoctors();
  const [doctorId, setDoctorId] = useState('');
  return (
    <>
      <PageHeader title={t('staff.schedule.title')} subtitle={t('staff.schedule.subtitle')} />
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        isEmpty={(list) => list.length === 0}
        empty={
          <Card>
            <EmptyState icon={CalendarClock} title={t('staff.doctors.emptyTitle')} />
          </Card>
        }
      >
        {(doctors) => {
          const active = doctors.filter((d) => d.active);
          const doctor = active.find((d) => d.doctorId === doctorId) ?? active[0];
          return (
            <Card title={t('staff.schedule.cardTitle')} icon={CalendarClock} titleAs="h2">
              <div className="max-w-sm">
                <Select
                  label={t('staff.schedule.doctor')}
                  value={doctor?.doctorId ?? ''}
                  onChange={(e) => setDoctorId(e.target.value)}
                  options={active.map((d) => ({ value: d.doctorId, label: l(d.name) }))}
                />
              </div>
              {doctor ? (
                <ScheduleEditor key={doctor.doctorId} doctor={doctor} />
              ) : (
                <EmptyState title={t('staff.doctors.emptyTitle')} />
              )}
            </Card>
          );
        }}
      </QueryState>
    </>
  );
}

function ScheduleEditor({ doctor }: { doctor: StaffDoctor }) {
  const { t, l } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const save = useSaveSchedule();
  const { control, register, handleSubmit, formState } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: toForm(doctor),
  });
  const onSubmit = handleSubmit((values) =>
    save.mutate(
      {
        doctorId: doctor.doctorId,
        schedule: values.days.map((d) => ({ day: d.day as Weekday, ranges: d.ranges })),
      },
      {
        onSuccess: () =>
          toast({ tone: 'success', message: t('staff.schedule.saved', { name: l(doctor.name) }) }),
        onError: showError,
      },
    ),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-3">
      {WEEK_ORDER.map((day, index) => (
        <DayRow
          key={day}
          index={index}
          day={day}
          control={control}
          register={register}
          error={
            formState.errors.days?.[index]?.ranges?.root?.message ??
            formState.errors.days?.[index]?.ranges?.message
          }
        />
      ))}
      <div>
        <Button type="submit" leadingIcon={Save} loading={save.isPending}>
          {t('staff.schedule.save')}
        </Button>
      </div>
    </form>
  );
}

function DayRow({
  index,
  day,
  control,
  register,
  error,
}: {
  index: number;
  day: Weekday;
  control: Control<ScheduleForm>;
  register: UseFormRegister<ScheduleForm>;
  error?: string;
}) {
  const { t, lang } = useLocale();
  const { fields, append, remove } = useFieldArray({ control, name: `days.${index}.ranges` });
  const dayName = weekdayName(day, lang);
  return (
    <fieldset className="rounded-2xl bg-brand-canvas p-4">
      <legend className="sr-only">{dayName}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className="w-16 font-semibold">
          {dayName}
        </span>
        {fields.length === 0 && (
          <span className="text-sm text-brand-muted">{t('staff.schedule.off')}</span>
        )}
        <div className="flex flex-1 flex-wrap gap-2">
          {fields.map((field, r) => (
            <div key={field.id} className="flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <input
                type="time"
                aria-label={t('staff.schedule.start', { day: dayName })}
                {...register(`days.${index}.ranges.${r}.start`)}
                className="min-h-touch rounded-full px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
              />
              <span aria-hidden="true">–</span>
              <input
                type="time"
                aria-label={t('staff.schedule.end', { day: dayName })}
                {...register(`days.${index}.ranges.${r}.end`)}
                className="min-h-touch rounded-full px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
              />
              <Button
                size="sm"
                variant="ghost"
                iconOnly={X}
                aria-label={t('staff.schedule.removeRange', { day: dayName })}
                onClick={() => remove(r)}
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={Plus}
          onClick={() => append({ start: '09:00', end: '12:00' })}
          aria-label={t('staff.schedule.addRangeFor', { day: dayName })}
        >
          {t('staff.schedule.addRange')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-[#B3262B]">
          {t('staff.form.errors.timeOrder')}
        </p>
      )}
    </fieldset>
  );
}
