import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useAddFeverLogEntry, useUpdateFeverLogEntry } from '@/api/queries';
import type { FeverLogEntry } from '@/api/types';
import { Button, Card, Input, Pill, useToast } from '@/components/ui';
import { WARNING_SIGNS } from '@/features/triage/rules';
import { cn } from '@/lib/cn';
import { parseLocaleNumber, toIsoDate } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import {
  feverEntrySchema,
  MAX_GLASSES,
  fToC,
  cToF,
  TEMP_RANGE,
  toFormValues,
  toInput,
  type FeverErrorKey,
  type FeverFormValues,
  type TempUnit,
} from './feverSchema';

export interface FeverEntryFormProps {
  /** Entry being edited, or null to add a new one. */
  entry: FeverLogEntry | null;
  entries: FeverLogEntry[];
  unit: TempUnit;
  onUnitChange: (unit: TempUnit) => void;
  onDone: () => void;
}

/** Daily fever / fluid entry (UC16), validated with zod. */
export function FeverEntryForm({
  entry,
  entries,
  unit,
  onUnitChange,
  onDone,
}: FeverEntryFormProps) {
  const { t, n, d } = useLocale();
  const toast = useToast();
  const add = useAddFeverLogEntry();
  const update = useUpdateFeverLogEntry();
  const today = toIsoDate(new Date());
  const takenDates = useMemo(
    () => entries.filter((e) => e.entryId !== entry?.entryId).map((e) => e.date),
    [entries, entry],
  );
  const schema = useMemo(() => feverEntrySchema(takenDates, today), [takenDates, today]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FeverFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(entry, unit, today),
  });
  const formUnit = useWatch({ control, name: 'unit' });
  const range = TEMP_RANGE[formUnit];

  const switchUnit = (next: TempUnit) => {
    if (next === getValues('unit')) return;
    const current = parseLocaleNumber(getValues('temperature'));
    if (!Number.isNaN(current)) {
      setValue('temperature', String(next === 'F' ? cToF(current) : fToC(current)));
    }
    setValue('unit', next);
    onUnitChange(next);
  };

  const errorText = (key: string | undefined) => {
    if (!key) return undefined;
    const k = key as FeverErrorKey;
    return k === 'tempRange'
      ? t('feverLog.errors.tempRange', {
          min: n(range.min),
          max: n(range.max),
          unit: `°${formUnit}`,
        })
      : t(`feverLog.errors.${k}`, { max: n(MAX_GLASSES) });
  };

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values);
    try {
      if (entry) await update.mutateAsync({ entryId: entry.entryId, input });
      else await add.mutateAsync(input);
      toast({
        tone: 'success',
        message: t(entry ? 'feverLog.updated' : 'feverLog.added', { date: d(input.date) }),
      });
      onDone();
    } catch (error) {
      toast({
        tone: 'error',
        message:
          error instanceof Error && error.message === 'DUPLICATE_DATE'
            ? t('feverLog.errors.dateDuplicate')
            : t('feverLog.saveError'),
      });
    }
  });

  const saving = add.isPending || update.isPending;

  return (
    <Card
      title={
        entry ? t('feverLog.form.editTitle', { date: d(entry.date) }) : t('feverLog.form.title')
      }
      titleAs="h2"
      icon={entry ? Pencil : Plus}
      actions={
        entry && (
          <Button variant="ghost" size="sm" leadingIcon={X} onClick={onDone}>
            {t('feverLog.form.cancelEdit')}
          </Button>
        )
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          type="date"
          label={t('feverLog.form.date')}
          max={today}
          error={errorText(errors.date?.message)}
          {...register('date')}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span id="fever-unit-label" className="text-sm font-medium">
              {t('feverLog.form.unit')}
            </span>
            <div role="group" aria-labelledby="fever-unit-label" className="flex gap-1">
              {(['C', 'F'] as const).map((u) => (
                <Pill key={u} selected={formUnit === u} onClick={() => switchUnit(u)}>
                  °{u}
                </Pill>
              ))}
            </div>
          </div>
          <Input
            label={t('feverLog.form.temperature', { unit: `°${formUnit}` })}
            inputMode="decimal"
            autoComplete="off"
            placeholder={
              formUnit === 'C'
                ? t('feverLog.form.tempPlaceholderC')
                : t('feverLog.form.tempPlaceholderF')
            }
            hint={t('feverLog.form.tempHint', {
              min: n(range.min),
              max: n(range.max),
              unit: `°${formUnit}`,
            })}
            error={errorText(errors.temperature?.message)}
            {...register('temperature')}
          />
        </div>

        <Input
          label={t('feverLog.form.fluids')}
          inputMode="numeric"
          autoComplete="off"
          hint={t('feverLog.form.fluidsHint')}
          error={errorText(errors.fluidGlasses?.message)}
          {...register('fluidGlasses')}
        />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t('feverLog.form.urine')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['normal', 'less'] as const).map((value) => (
              <label
                key={value}
                className="flex min-h-touch cursor-pointer items-center gap-2 rounded-2xl bg-brand-canvas px-4 text-sm has-[:checked]:bg-brand-lime-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink has-[:checked]:ring-1 has-[:checked]:ring-brand-ink"
              >
                <input
                  type="radio"
                  value={value}
                  className="h-5 w-5 accent-brand-ink focus:outline-none"
                  {...register('urine')}
                />
                {t(`feverLog.urine.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">{t('feverLog.form.warningSigns')}</legend>
          <p className="mb-2 text-xs text-brand-muted">{t('feverLog.form.warningHint')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {WARNING_SIGNS.map((sign) => (
              <label
                key={sign}
                className={cn(
                  'flex min-h-touch cursor-pointer items-center gap-2 rounded-2xl bg-brand-canvas px-4 py-2 text-sm',
                  'has-[:checked]:bg-[#FBE3E4] has-[:checked]:text-[#8E1F23] has-[:checked]:ring-1 has-[:checked]:ring-[#E5484D]',
                  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink',
                )}
              >
                <input
                  type="checkbox"
                  value={sign}
                  className="h-5 w-5 shrink-0 accent-[#C9353A] focus:outline-none"
                  {...register('warningSigns')}
                />
                {t(`triage.options.warningSigns.${sign}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" leadingIcon={Save} loading={saving} fullWidth>
          {entry ? t('feverLog.form.update') : t('feverLog.form.save')}
        </Button>
      </form>
    </Card>
  );
}
