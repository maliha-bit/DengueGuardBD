import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ImagePlus,
  ListChecks,
  LocateFixed,
  MapPin,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useCreateBreedingReport, useDivisions } from '@/api/queries';
import type { BreedingReport } from '@/api/types';
import { useDivision } from '@/app/division';
import { RequireLogin } from '@/app/RequireLogin';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  buttonClasses,
  Card,
  Input,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { useGeolocation } from '@/features/emergency/useGeolocation';
import { cn } from '@/lib/cn';
import { localDigits } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import {
  MAX_PHOTO_BYTES,
  readAsDataUrl,
  SITE_TYPES,
  validatePhoto,
  type PhotoError,
} from './reportUtils';

const LocationPickerMap = lazy(() => import('./LocationPickerMap'));

type ErrorKey = 'location' | 'area' | 'note';

const schema = z
  .object({
    location: z.tuple([z.number(), z.number()]).nullable(),
    areaName: z
      .string()
      .min(1, 'area' satisfies ErrorKey)
      .max(120, 'area'),
    siteType: z.enum(['standing_water', 'drain', 'tyres', 'construction', 'other']),
    note: z.string().max(300, 'note' satisfies ErrorKey),
  })
  .superRefine((values, ctx) => {
    // A report is only useful with a location.
    if (!values.location) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'location' satisfies ErrorKey });
    }
    if (values.areaName.trim().length < 3) {
      ctx.addIssue({ code: 'custom', path: ['areaName'], message: 'area' satisfies ErrorKey });
    }
  });
type FormValues = z.infer<typeof schema>;

/** Report a breeding site (UC: breeding-site report). Login required. */
export default function NewReportPage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('reports.form.title')} message={t('reports.loginMessage')}>
      <NewReport />
    </RequireLogin>
  );
}

function NewReport() {
  const { t } = useLocale();
  const [submitted, setSubmitted] = useState<BreedingReport | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <PageHeader
        title={t('reports.form.title')}
        subtitle={t('reports.form.subtitle')}
        actions={
          <Link to="/reports" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            {t('reports.list.title')}
          </Link>
        }
      />
      {submitted ? (
        <Success
          report={submitted}
          onAnother={() => {
            setSubmitted(null);
            setFormKey((k) => k + 1);
          }}
        />
      ) : (
        <ReportForm key={formKey} onDone={setSubmitted} />
      )}
    </>
  );
}

function Success({ report, onAnother }: { report: BreedingReport; onAnother: () => void }) {
  const { t, lang } = useLocale();
  return (
    <Card className="mx-auto max-w-lg text-center">
      <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-[#1F7A4A]" />
      <h2 className="mt-3 text-xl font-semibold">{t('reports.success.title')}</h2>
      <p className="mt-1 text-sm text-brand-muted">{t('reports.success.body')}</p>
      <p className="mt-4 text-sm text-brand-muted">{t('reports.success.reference')}</p>
      <p
        className="mx-auto mt-1 w-fit rounded-2xl bg-brand-lime px-5 py-2 text-2xl font-semibold"
        data-testid="report-reference"
      >
        {localDigits(report.reference, lang)}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/reports" className={buttonClasses({ variant: 'secondary' })}>
          <ListChecks aria-hidden="true" className="h-4 w-4" />
          {t('reports.list.title')}
        </Link>
        <Button leadingIcon={Plus} onClick={onAnother}>
          {t('reports.success.another')}
        </Button>
      </div>
    </Card>
  );
}

function ReportForm({ onDone }: { onDone: (report: BreedingReport) => void }) {
  const { t, n } = useLocale();
  const toast = useToast();
  const create = useCreateBreedingReport();
  const geo = useGeolocation();
  const { divisionId } = useDivision();
  const divisions = useDivisions();
  const center = divisions.data?.find((d) => d.divisionId === divisionId)?.center;
  const photoInputId = useId();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<PhotoError | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location: null, areaName: '', siteType: 'standing_water', note: '' },
  });
  const location = useWatch({ control, name: 'location' });
  const pick = (point: [number, number]) => setValue('location', point, { shouldValidate: true });

  // "Use my location" fills the pin.
  useEffect(() => {
    if (geo.status === 'found' && geo.position) {
      setValue('location', geo.position, { shouldValidate: true });
    }
  }, [geo.status, geo.position, setValue]);

  const onPhoto = async (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) {
      setPhoto(null);
      setPhotoError(problem);
      return;
    }
    try {
      setPhoto(await readAsDataUrl(file));
    } catch {
      setPhotoError('type');
    }
  };

  const err = (key?: string) => (key ? t(`reports.form.errors.${key as ErrorKey}`) : undefined);

  const submit = handleSubmit((values) => {
    if (!values.location || photoError) return;
    create.mutate(
      {
        photoUrl: photo,
        location: values.location,
        areaName: values.areaName.trim(),
        siteType: values.siteType,
        note: values.note.trim(),
      },
      {
        onSuccess: onDone,
        onError: () => toast({ tone: 'error', message: t('reports.form.saveError') }),
      },
    );
  });

  return (
    <form noValidate onSubmit={submit} className="grid items-start gap-4 lg:grid-cols-2">
      <Card title={t('reports.form.locationTitle')} titleAs="h2" icon={MapPin}>
        <p className="mb-3 text-sm text-brand-muted">{t('reports.form.locationHint')}</p>
        <div className="h-72 overflow-hidden rounded-2xl">
          <Suspense
            fallback={
              <SkeletonGroup className="h-full">
                <Skeleton shape="rect" className="h-full" />
              </SkeletonGroup>
            }
          >
            <LocationPickerMap value={location} onChange={pick} center={center} />
          </Suspense>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={LocateFixed}
            loading={geo.status === 'locating'}
            onClick={geo.locate}
          >
            {t('reports.form.useMyLocation')}
          </Button>
          <p className="text-sm text-brand-muted" aria-live="polite">
            {location
              ? t('reports.form.picked', {
                  lat: n(location[0], { maximumFractionDigits: 5 }),
                  lng: n(location[1], { maximumFractionDigits: 5 }),
                })
              : t('reports.form.notPicked')}
          </p>
        </div>
        {(geo.status === 'denied' || geo.status === 'unavailable') && (
          <p role="alert" className="mt-2 rounded-2xl bg-[#FCF0D6] p-3 text-sm text-[#6B4A06]">
            {t('reports.form.locationDenied')}
          </p>
        )}
        {errors.location && (
          <p role="alert" className="mt-2 text-sm font-medium text-[#B3262B]">
            {err(errors.location.message)}
          </p>
        )}
      </Card>

      <Card title={t('reports.form.detailsTitle')} titleAs="h2" icon={ImagePlus}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={photoInputId} className="text-sm font-medium">
              {t('reports.form.photo')}
              <span className="ml-1 font-normal text-brand-muted">({t('common.optional')})</span>
            </label>
            <input
              id={photoInputId}
              type="file"
              accept="image/jpeg,image/png"
              aria-describedby={`${photoInputId}-hint`}
              aria-invalid={photoError ? true : undefined}
              onChange={(e) => void onPhoto(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:min-h-touch file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-ink file:px-4 file:text-sm file:font-medium file:text-white"
            />
            <p
              id={`${photoInputId}-hint`}
              className={cn(
                'text-xs',
                photoError ? 'font-medium text-[#B3262B]' : 'text-brand-muted',
              )}
              role={photoError ? 'alert' : undefined}
            >
              {photoError
                ? t(`reports.form.photoErrors.${photoError}`, {
                    max: n(MAX_PHOTO_BYTES / 1024 / 1024),
                  })
                : t('reports.form.photoHint', { max: n(MAX_PHOTO_BYTES / 1024 / 1024) })}
            </p>
            {photo && (
              <div className="relative mt-1 w-fit">
                <img
                  src={photo}
                  alt={t('reports.form.preview')}
                  className="h-40 rounded-2xl object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  iconOnly={Trash2}
                  aria-label={t('reports.form.removePhoto')}
                  onClick={() => setPhoto(null)}
                  className="absolute right-2 top-2"
                />
              </div>
            )}
          </div>

          <Input
            label={t('reports.form.area')}
            placeholder={t('reports.form.areaPlaceholder')}
            error={err(errors.areaName?.message)}
            {...register('areaName')}
          />

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t('reports.form.siteType')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SITE_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-2xl bg-brand-canvas px-4 text-sm has-[:checked]:bg-brand-lime-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink has-[:checked]:ring-1 has-[:checked]:ring-brand-ink"
                >
                  <input
                    type="radio"
                    value={type}
                    className="h-5 w-5 accent-brand-ink focus:outline-none"
                    {...register('siteType')}
                  />
                  {t(`reports.siteTypes.${type}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            label={t('reports.form.note')}
            optional
            maxLength={300}
            error={err(errors.note?.message)}
            {...register('note')}
          />

          <Button type="submit" leadingIcon={Send} loading={create.isPending} fullWidth>
            {t('reports.form.submit')}
          </Button>
          <p className="text-xs text-brand-muted">{t('reports.form.privacy')}</p>
        </div>
      </Card>
    </form>
  );
}
