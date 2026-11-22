import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Eye, FlaskConical, Send } from 'lucide-react';
import { Controller, useForm, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { usePublishLab, useStaffLab } from '@/api/staffQueries';
import type { Lab } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import { Button, Card, EmptyState, Input, SkeletonCard, Switch, useToast } from '@/components/ui';
import { LabCard } from '@/features/labs/LabsPage';
import { weekdayName } from '@/lib/format';
import { WEEK_ORDER } from '@/lib/slots';
import { useLocale } from '@/lib/useLocale';
import {
  listingSchema,
  previewLab,
  toListingForm,
  toListingInput,
  type ListingForm,
  type ListingValues,
} from './listing';

/** Lab listing editor: info, hours per day, tests and prices, home collection, preview, publish. */
export default function LabListingPage() {
  const { t } = useLocale();
  const query = useStaffLab();
  return (
    <>
      <PageHeader title={t('staff.lab.title')} subtitle={t('staff.lab.subtitle')} />
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        empty={
          <Card>
            <EmptyState icon={FlaskConical} title={t('staff.lab.notFound')} />
          </Card>
        }
      >
        {(lab) => <ListingEditor key={lab.labId} lab={lab} />}
      </QueryState>
    </>
  );
}

function ListingEditor({ lab }: { lab: Lab }) {
  const { t, l } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const publish = usePublishLab();
  const { control, register, handleSubmit, formState, reset } = useForm<
    ListingForm,
    unknown,
    ListingValues
  >({
    resolver: zodResolver(listingSchema),
    defaultValues: toListingForm(lab),
  });
  const values = useWatch({ control }) as ListingForm;
  const errors = formState.errors;

  const onSubmit = handleSubmit((form) =>
    publish.mutate(toListingInput(form), {
      onSuccess: (saved) => {
        reset(toListingForm(saved));
        toast({ tone: 'success', message: t('staff.lab.published') });
      },
      onError: showError,
    }),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),380px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Card title={t('staff.lab.infoTitle')} icon={FlaskConical} titleAs="h2">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('staff.lab.name')}
              {...register('name')}
              error={fieldError(errors.name?.message)}
            />
            <Input
              label={t('staff.lab.nameBn')}
              lang="bn"
              {...register('nameBn')}
              error={fieldError(errors.nameBn?.message)}
            />
            <Input
              label={t('staff.lab.address')}
              {...register('address')}
              error={fieldError(errors.address?.message)}
            />
            <Input
              label={t('staff.lab.phone')}
              inputMode="tel"
              {...register('phone')}
              error={fieldError(errors.phone?.message)}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-brand-canvas px-4 py-1">
            <Controller
              control={control}
              name="homeCollection"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('staff.lab.homeCollection')}
                  description={t('staff.lab.homeCollectionHint')}
                />
              )}
            />
          </div>
        </Card>

        <Card title={t('staff.lab.hoursTitle')} icon={Clock} titleAs="h2">
          <div className="flex flex-col gap-2">
            {WEEK_ORDER.map((day) => (
              <HoursRow
                key={day}
                day={day}
                control={control}
                register={register}
                invalid={Boolean(errors.weeklyHours?.[day])}
              />
            ))}
          </div>
        </Card>

        <Card title={t('staff.lab.testsTitle')} titleAs="h2">
          <div className="flex flex-col gap-3">
            {values.tests.map((test, i) => (
              <fieldset key={test.code} className="min-w-0 rounded-2xl bg-brand-canvas p-4">
                <legend className="sr-only">{t(`chatbot.tests.${test.code}`)}</legend>
                <label className="flex min-h-touch items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    {...register(`tests.${i}.offered`)}
                    className="h-5 w-5 accent-brand-ink"
                  />
                  {t('staff.lab.offers', { test: t(`chatbot.tests.${test.code}`) })}
                </label>
                {test.offered && (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      label={t('staff.lab.priceMin', { test: t(`chatbot.tests.${test.code}`) })}
                      {...register(`tests.${i}.priceBdt`)}
                      error={fieldError(errors.tests?.[i]?.priceBdt?.message)}
                    />
                    <Input
                      type="number"
                      min={0}
                      label={t('staff.lab.priceMax', { test: t(`chatbot.tests.${test.code}`) })}
                      {...register(`tests.${i}.priceMaxBdt`)}
                      error={fieldError(errors.tests?.[i]?.priceMaxBdt?.message)}
                    />
                  </div>
                )}
              </fieldset>
            ))}
            {errors.tests?.root?.message || errors.tests?.message ? (
              <p role="alert" className="text-xs font-medium text-[#B3262B]">
                {t('staff.lab.oneTest')}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" leadingIcon={Send} loading={publish.isPending}>
            {t('staff.lab.publish')}
          </Button>
          <Freshness
            updatedAt={lab.updatedAt}
            stale={false}
            text={(time) => t('staff.lab.lastPublished', { time })}
          />
        </div>
      </form>

      <section aria-labelledby="lab-preview" className="xl:sticky xl:top-4 xl:self-start">
        <h2 id="lab-preview" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Eye aria-hidden="true" className="h-4 w-4" />
          {t('staff.lab.previewTitle')}
        </h2>
        <div className="ring-dashed rounded-3xl ring-2 ring-brand-lavender">
          <LabCard lab={previewLab(lab, values)} />
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          {t('staff.lab.previewHint', { name: l(lab.name) })}
        </p>
      </section>
    </div>
  );
}

function HoursRow({
  day,
  control,
  register,
  invalid,
}: {
  day: number;
  control: Control<ListingForm, unknown, ListingValues>;
  register: UseFormRegister<ListingForm>;
  invalid: boolean;
}) {
  const { t, lang } = useLocale();
  const kind = useWatch({ control, name: `weeklyHours.${day}.kind` });
  const dayName = weekdayName(day, lang);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-canvas px-3 py-2">
      <span className="w-14 font-semibold">{dayName}</span>
      <select
        aria-label={t('staff.lab.hoursFor', { day: dayName })}
        {...register(`weeklyHours.${day}.kind`)}
        className="min-h-touch rounded-full bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
      >
        <option value="hours">{t('staff.lab.kind.hours')}</option>
        <option value="allDay">{t('staff.lab.kind.allDay')}</option>
        <option value="closed">{t('staff.lab.kind.closed')}</option>
      </select>
      {kind === 'hours' && (
        <span className="flex items-center gap-1">
          <input
            type="time"
            aria-label={t('staff.lab.opens', { day: dayName })}
            {...register(`weeklyHours.${day}.opens`)}
            className="min-h-touch rounded-full bg-white px-2 text-sm"
          />
          <span aria-hidden="true">–</span>
          <input
            type="time"
            aria-label={t('staff.lab.closes', { day: dayName })}
            {...register(`weeklyHours.${day}.closes`)}
            className="min-h-touch rounded-full bg-white px-2 text-sm"
          />
        </span>
      )}
      {invalid && (
        <span role="alert" className="text-xs font-medium text-[#B3262B]">
          {t('staff.form.errors.timeOrder')}
        </span>
      )}
    </div>
  );
}
