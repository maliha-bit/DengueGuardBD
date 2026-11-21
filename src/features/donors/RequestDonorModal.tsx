import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ListChecks, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useCreateDonorRequest, useHospitals } from '@/api/queries';
import type { BloodGroup, DonorListing } from '@/api/types';
import { Button, buttonClasses, Input, Modal, Select, useToast } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { BLOOD_GROUPS, isValidBdMobile, normalizePhone } from './donorUtils';

const MAX_UNITS = 5;
const MAX_DAYS_AHEAD = 14;

/** datetime-local value for a Date (local time, minutes precision). */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ErrorKey =
  'hospital' | 'units' | 'neededBy' | 'neededByPast' | 'neededByFar' | 'phone' | 'note';

function requestSchema(now: Date) {
  return z
    .object({
      patientBloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      hospitalId: z.string().min(1, 'hospital' satisfies ErrorKey),
      unitsNeeded: z.coerce
        .number({ invalid_type_error: 'units' satisfies ErrorKey })
        .int('units')
        .min(1, 'units')
        .max(MAX_UNITS, 'units'),
      neededBy: z.string().min(1, 'neededBy' satisfies ErrorKey),
      contactPhone: z.string().refine(isValidBdMobile, 'phone' satisfies ErrorKey),
      note: z.string().max(300, 'note' satisfies ErrorKey),
    })
    .superRefine((values, ctx) => {
      if (!values.neededBy) return;
      const when = new Date(values.neededBy);
      if (Number.isNaN(when.getTime()) || when <= now) {
        ctx.addIssue({ code: 'custom', path: ['neededBy'], message: 'neededByPast' });
      } else if (when.getTime() - now.getTime() > MAX_DAYS_AHEAD * 86_400_000) {
        ctx.addIssue({ code: 'custom', path: ['neededBy'], message: 'neededByFar' });
      }
    });
}

type FormValues = z.input<ReturnType<typeof requestSchema>>;

/** Request form for one donor (login already checked by the caller). */
export function RequestDonorModal({
  donor,
  onClose,
}: {
  donor: DonorListing;
  onClose: () => void;
}) {
  const { t, l, n } = useLocale();
  const toast = useToast();
  const hospitals = useHospitals();
  const create = useCreateDonorRequest();
  const [sent, setSent] = useState(false);
  const now = useMemo(() => new Date(), []);
  const schema = useMemo(() => requestSchema(now), [now]);

  const hospitalOptions = useMemo(() => {
    const all = hospitals.data?.map((s) => s.hospital) ?? [];
    // Hospitals in the donor's division first.
    const sorted = [...all].sort(
      (a, b) =>
        Number(b.divisionId === donor.divisionId) - Number(a.divisionId === donor.divisionId),
    );
    return sorted.map((h) => ({ value: h.hospitalId, label: `${l(h.name)} (${l(h.district)})` }));
  }, [hospitals.data, donor.divisionId, l]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientBloodGroup: donor.bloodGroup,
      hospitalId: '',
      unitsNeeded: 1,
      neededBy: toLocalInput(new Date(now.getTime() + 24 * 3_600_000)),
      contactPhone: '',
      note: '',
    },
  });

  const errorText = (key?: string) =>
    key
      ? t(`donors.request.errors.${key as ErrorKey}`, {
          max: n(MAX_UNITS),
          days: n(MAX_DAYS_AHEAD),
        })
      : undefined;

  const submit = handleSubmit((values) => {
    create.mutate(
      {
        donorId: donor.donorId,
        patientBloodGroup: values.patientBloodGroup as BloodGroup,
        hospitalId: values.hospitalId,
        unitsNeeded: Number(values.unitsNeeded),
        neededBy: new Date(values.neededBy).toISOString(),
        contactPhone: normalizePhone(values.contactPhone),
        note: values.note.trim(),
      },
      {
        onSuccess: () => setSent(true),
        onError: (error) =>
          toast({
            tone: 'error',
            message:
              error instanceof Error && error.message === 'DONOR_UNAVAILABLE'
                ? t('donors.request.unavailable')
                : t('donors.request.error'),
          }),
      },
    );
  });

  if (sent) {
    return (
      <Modal
        open
        onClose={onClose}
        size="sm"
        title={t('donors.request.sentTitle')}
        description={t('donors.request.sentBody')}
        footer={
          <>
            <Link to="/donors/requests" className={buttonClasses({ variant: 'secondary' })}>
              <ListChecks aria-hidden="true" className="h-4 w-4" />
              {t('donors.tabs.requests')}
            </Link>
            <Button onClick={onClose}>{t('booking.done')}</Button>
          </>
        }
      >
        <CheckCircle2 aria-hidden="true" className="mx-auto h-10 w-10 text-[#1F7A4A]" />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('donors.request.title', { group: donor.bloodGroup })}
      description={t('donors.request.privacy')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="donor-request-form"
            leadingIcon={Send}
            loading={create.isPending}
          >
            {t('donors.request.send')}
          </Button>
        </>
      }
    >
      <form
        id="donor-request-form"
        noValidate
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Select
          label={t('donors.request.patientGroup')}
          options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
          {...register('patientBloodGroup')}
        />
        <Input
          label={t('donors.request.units')}
          inputMode="numeric"
          error={errorText(errors.unitsNeeded?.message)}
          {...register('unitsNeeded')}
        />
        <div className="sm:col-span-2">
          <Select
            label={t('donors.request.hospital')}
            placeholder={t('donors.request.hospitalPlaceholder')}
            options={hospitalOptions}
            error={errorText(errors.hospitalId?.message)}
            {...register('hospitalId')}
          />
        </div>
        <Input
          type="datetime-local"
          label={t('donors.request.neededBy')}
          min={toLocalInput(now)}
          error={errorText(errors.neededBy?.message)}
          {...register('neededBy')}
        />
        <Input
          label={t('donors.request.contact')}
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          hint={t('donors.request.contactHint')}
          error={errorText(errors.contactPhone?.message)}
          {...register('contactPhone')}
        />
        <div className="sm:col-span-2">
          <Input
            label={t('donors.request.note')}
            optional
            maxLength={300}
            error={errorText(errors.note?.message)}
            {...register('note')}
          />
        </div>
      </form>
    </Modal>
  );
}
