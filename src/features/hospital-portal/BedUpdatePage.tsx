import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { BedDouble, Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useStaffHospital, useUpdateBeds } from '@/api/staffQueries';
import type { StaffHospital } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useStaffError } from '@/components/useStaffError';
import { Button, Card, EmptyState, NumberStepper, SkeletonCard, useToast } from '@/components/ui';
import type { BedError } from '@/lib/beds';
import { useLocale } from '@/lib/useLocale';
import { bedSchema, type BedFormValues } from './bedForm';

/** Bed update: big steppers, 0..total validation, Save, "Last updated". */
export default function BedUpdatePage() {
  const { t } = useLocale();
  const query = useStaffHospital();
  return (
    <>
      <PageHeader title={t('staff.beds.title')} subtitle={t('staff.beds.subtitle')} />
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        empty={
          <Card>
            <EmptyState title={t('staff.hospital.notFound')} />
          </Card>
        }
      >
        {/* Keyed by hospital, not by update time: a background refetch must not reset a
            half-finished edit. */}
        {(data) => <BedForm key={data.hospital.hospitalId} data={data} />}
      </QueryState>
    </>
  );
}

function BedForm({ data }: { data: StaffHospital }) {
  const { t, l, n } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const update = useUpdateBeds();
  const { beds } = data;
  const schema = useMemo(() => bedSchema(beds), [beds]);
  const { control, handleSubmit, formState, reset } = useForm<BedFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { generalAvailable: beds.generalAvailable, icuAvailable: beds.icuAvailable },
    mode: 'onChange',
  });
  const errorText = (code: string | undefined, total: number) =>
    code ? t(`staff.beds.errors.${code as BedError}`, { total: n(total) }) : undefined;

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (saved) => {
        reset({ generalAvailable: saved.generalAvailable, icuAvailable: saved.icuAvailable });
        toast({ tone: 'success', message: t('staff.beds.saved') });
      },
      onError: showError,
    }),
  );

  return (
    <Card title={l(data.hospital.name)} icon={BedDouble} titleAs="h2">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="generalAvailable"
            render={({ field, fieldState }) => (
              <NumberStepper
                label={t('staff.beds.general')}
                value={field.value}
                onChange={field.onChange}
                max={beds.generalTotal}
                unit={t('staff.beds.ofTotal', { total: n(beds.generalTotal) })}
                error={errorText(fieldState.error?.message, beds.generalTotal)}
              />
            )}
          />
          <Controller
            control={control}
            name="icuAvailable"
            render={({ field, fieldState }) => (
              <NumberStepper
                label={t('staff.beds.icu')}
                value={field.value}
                onChange={field.onChange}
                max={beds.icuTotal}
                unit={t('staff.beds.ofTotal', { total: n(beds.icuTotal) })}
                error={errorText(fieldState.error?.message, beds.icuTotal)}
              />
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            size="lg"
            leadingIcon={Save}
            loading={update.isPending}
            disabled={!formState.isValid}
          >
            {t('staff.beds.save')}
          </Button>
          <Freshness
            updatedAt={beds.updatedAt}
            text={(time) => t('staff.beds.lastUpdated', { time })}
          />
        </div>
        <p className="text-xs text-brand-muted">{t('staff.beds.hint')}</p>
      </form>
    </Card>
  );
}
