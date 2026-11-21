import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CalendarPlus, Eye, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  usePreviewSlots,
  usePublishedSlots,
  usePublishSlots,
  useStaffDoctors,
} from '@/api/staffQueries';
import type { SlotDraft, SlotGeneratorInput, StaffDoctor } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SkeletonCard,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatTime, toIsoDate } from '@/lib/format';
import { daysInRange, MAX_GENERATOR_DAYS } from '@/lib/slots';
import { isoDateField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const SLOT_LENGTHS = [10, 15, 20, 30] as const;

const generatorSchema = z
  .object({
    doctorId: z.string().min(1, 'required'),
    from: isoDateField,
    to: isoDateField,
    slotMinutes: z.coerce.number().int().min(5, 'number'),
    capacity: z.coerce
      .number({ invalid_type_error: 'number' })
      .int('number')
      .min(1, 'range')
      .max(50, 'range'),
  })
  .superRefine((v, ctx) => {
    if (v.from < toIsoDate(new Date()))
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'pastDate' });
    if (v.to < v.from) ctx.addIssue({ code: 'custom', path: ['to'], message: 'dateOrder' });
    else if (daysInRange(v.from, v.to) > MAX_GENERATOR_DAYS) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'tooManyDays' });
    }
  });
type GeneratorForm = z.input<typeof generatorSchema>;

const sameSlot = (a: SlotDraft, b: SlotDraft) => a.start === b.start && a.doctorId === b.doctorId;

/** Slot generator: doctor + date range + slot length + places → preview → publish. */
export default function SlotGeneratorPage() {
  const { t } = useLocale();
  const doctors = useStaffDoctors();
  return (
    <>
      <PageHeader title={t('staff.slots.title')} subtitle={t('staff.slots.subtitle')} />
      <QueryState
        query={doctors}
        skeleton={<SkeletonCard />}
        isEmpty={(list) => list.every((d) => !d.active)}
        empty={
          <Card>
            <EmptyState icon={CalendarPlus} title={t('staff.doctors.emptyTitle')} />
          </Card>
        }
      >
        {(list) => <Generator doctors={list.filter((d) => d.active)} />}
      </QueryState>
      <PublishedList />
    </>
  );
}

function Generator({ doctors }: { doctors: StaffDoctor[] }) {
  const { t, l, n, d, lang } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const preview = usePreviewSlots();
  const publish = usePublishSlots();
  const [previewed, setPreviewed] = useState<SlotGeneratorInput | null>(null);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { register, handleSubmit, formState, watch } = useForm<
    GeneratorForm,
    unknown,
    z.output<typeof generatorSchema>
  >({
    resolver: zodResolver(generatorSchema),
    defaultValues: {
      doctorId: doctors[0]?.doctorId ?? '',
      from: toIsoDate(tomorrow),
      to: toIsoDate(tomorrow),
      slotMinutes: 30,
      capacity: 10,
    },
  });
  const values = watch();
  const stale =
    previewed !== null &&
    (previewed.doctorId !== values.doctorId ||
      previewed.from !== values.from ||
      previewed.to !== values.to ||
      previewed.slotMinutes !== Number(values.slotMinutes) ||
      previewed.capacity !== Number(values.capacity));
  const result = previewed && !stale ? preview.data : undefined;

  const onPreview = handleSubmit((input) =>
    preview.mutate(input, { onSuccess: () => setPreviewed(input), onError: showError }),
  );
  const onPublish = () => {
    if (!previewed) return;
    publish.mutate(previewed, {
      onSuccess: (slots) => {
        toast({ tone: 'success', message: t('staff.slots.published', { value: n(slots.length) }) });
        setPreviewed(null);
        preview.reset();
      },
      onError: showError,
    });
  };

  const byDate = new Map<string, SlotDraft[]>();
  for (const draft of result?.drafts ?? []) {
    const key = toIsoDate(new Date(draft.start));
    byDate.set(key, [...(byDate.get(key) ?? []), draft]);
  }
  const overlapCount = result?.overlaps.length ?? 0;

  return (
    <Card title={t('staff.slots.formTitle')} icon={CalendarPlus} titleAs="h2">
      <form onSubmit={onPreview} noValidate className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Select
          label={t('staff.slots.doctor')}
          {...register('doctorId')}
          options={doctors.map((doc) => ({ value: doc.doctorId, label: l(doc.name) }))}
          error={fieldError(formState.errors.doctorId?.message)}
        />
        <Input
          type="date"
          label={t('staff.slots.from')}
          {...register('from')}
          error={fieldError(formState.errors.from?.message)}
        />
        <Input
          type="date"
          label={t('staff.slots.to')}
          {...register('to')}
          error={fieldError(formState.errors.to?.message)}
        />
        <Select
          label={t('staff.slots.length')}
          {...register('slotMinutes')}
          options={SLOT_LENGTHS.map((m) => ({
            value: String(m),
            label: t('staff.slots.minutes', { value: n(m) }),
          }))}
        />
        <Input
          type="number"
          min={1}
          max={50}
          label={t('staff.slots.capacity')}
          {...register('capacity')}
          error={fieldError(formState.errors.capacity?.message)}
        />
        <div className="md:col-span-2 xl:col-span-5">
          <Button type="submit" variant="dark" leadingIcon={Eye} loading={preview.isPending}>
            {t('staff.slots.preview')}
          </Button>
        </div>
      </form>

      {result && (
        <section aria-labelledby="slot-preview" className="mt-6">
          <h3 id="slot-preview" className="text-base font-semibold">
            {t('staff.slots.previewTitle', { value: n(result.drafts.length) })}
          </h3>
          {result.drafts.length === 0 ? (
            <EmptyState
              compact
              title={t('staff.slots.noneTitle')}
              message={t('staff.slots.noneMessage')}
            />
          ) : (
            <>
              {overlapCount > 0 && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FBE3E4] p-3 text-sm text-[#8E1F23]"
                >
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('staff.slots.overlapError', { value: n(overlapCount) })}
                </div>
              )}
              <ul className="mt-3 flex flex-col gap-3">
                {[...byDate.entries()].map(([date, drafts]) => (
                  <li key={date}>
                    <p className="text-sm font-medium">
                      {d(date, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {drafts.map((draft) => {
                        const clash = result.overlaps.some((o) => sameSlot(o, draft));
                        return (
                          <li
                            key={draft.start}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                              clash
                                ? 'bg-[#FBE3E4] text-[#8E1F23] ring-1 ring-[#E5484D]'
                                : 'bg-brand-lime-soft',
                            )}
                          >
                            {clash && <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />}
                            {formatTime(draft.start, lang)}–{formatTime(draft.end, lang)}
                            {clash && (
                              <span className="sr-only">({t('staff.slots.overlapLabel')})</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4"
                leadingIcon={Send}
                loading={publish.isPending}
                disabled={overlapCount > 0}
                onClick={onPublish}
              >
                {t('staff.slots.publish')}
              </Button>
            </>
          )}
        </section>
      )}
    </Card>
  );
}

function PublishedList() {
  const { t, l, n, d, lang } = useLocale();
  const slots = usePublishedSlots();
  const doctors = useStaffDoctors();
  const name = (id: string) => {
    const doctor = doctors.data?.find((doc) => doc.doctorId === id);
    return doctor ? l(doctor.name) : id;
  };
  const now = new Date().toISOString();
  return (
    <Card title={t('staff.slots.publishedTitle')} titleAs="h2" className="mt-4">
      <QueryState
        query={slots}
        skeleton={<SkeletonCard />}
        isEmpty={(list) => list.every((s) => s.end < now)}
        empty={<EmptyState compact title={t('staff.slots.publishedEmpty')} />}
      >
        {(list) => (
          <ul className="flex flex-col gap-2 text-sm">
            {list
              .filter((s) => s.end >= now)
              .slice(0, 12)
              .map((slot) => (
                <li
                  key={slot.slotId}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-canvas px-4 py-2"
                >
                  <span className="font-medium">{name(slot.doctorId)}</span>
                  <span>{d(slot.start, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>
                    {formatTime(slot.start, lang)}–{formatTime(slot.end, lang)}
                  </span>
                  <Badge tone="lavender" className="ml-auto">
                    {t('staff.slots.places', {
                      booked: n(slot.booked),
                      capacity: n(slot.capacity),
                    })}
                  </Badge>
                </li>
              ))}
          </ul>
        )}
      </QueryState>
    </Card>
  );
}
