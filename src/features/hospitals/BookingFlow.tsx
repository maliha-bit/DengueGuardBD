import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarPlus, CheckCircle2, CircleAlert, ListChecks } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useBookAppointment, useCurrentUser } from '@/api/queries';
import type { Appointment, Doctor, Hospital, Slot } from '@/api/types';
import { useSession } from '@/app/session';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Button, buttonClasses, Input, Modal, Skeleton } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import {
  addToCalendar,
  bookingErrorKey,
  useBookingErrorText,
  type ErrorKey,
} from './bookingHelpers';
import { SummaryRows } from './SummaryRows';

const schema = z.object({ patientName: z.string().trim().min(3).max(80) });
type FormValues = z.infer<typeof schema>;

/**
 * Login → confirm → success for one slot. Guests log in first and land back on the same slot
 * (the slot stays in the URL).
 */
export function BookingFlow({
  hospital,
  doctor,
  slot,
  onClose,
}: {
  hospital: Hospital;
  doctor: Doctor;
  slot: Slot | null;
  /** Called when the flow ends (cancelled, finished, or the slot filled up). */
  onClose: () => void;
}) {
  const { t, l, n, d, lang } = useLocale();
  const { isLoggedIn } = useSession();
  const user = useCurrentUser();
  const book = useBookAppointment();
  const errorText = useBookingErrorText();
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { patientName: '' } });

  // Prefill the patient name from the profile once it loads.
  const profileName = user.data ? l(user.data.name) : '';
  useEffect(() => {
    if (profileName && !isDirty) reset({ patientName: profileName });
  }, [profileName, isDirty, reset]);

  // A new slot starts a fresh attempt.
  useEffect(() => setError(null), [slot?.slotId]);

  const finish = () => {
    setBooked(null);
    setError(null);
    book.reset();
    onClose();
  };

  if (booked) {
    return (
      <Modal
        open
        onClose={finish}
        title={t('booking.successTitle')}
        description={t('booking.successMessage')}
        footer={
          <>
            <Button
              variant="secondary"
              leadingIcon={CalendarPlus}
              onClick={() => addToCalendar(booked, t)}
            >
              {t('booking.addToCalendar')}
            </Button>
            <Link to="/appointments" className={buttonClasses({ variant: 'secondary' })}>
              <ListChecks aria-hidden="true" className="h-4 w-4" />
              {t('booking.viewAppointments')}
            </Link>
            <Button onClick={finish}>{t('booking.done')}</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-[#1F7A4A]" />
          <p className="text-sm text-brand-muted">{t('booking.serial')}</p>
          <p className="rounded-2xl bg-brand-lime px-6 py-2 text-[2.5rem] font-semibold leading-none">
            {n(booked.serialNo, { minimumIntegerDigits: 2 })}
          </p>
        </div>
        <SummaryRows
          rows={[
            [t('booking.doctor'), l(booked.doctor.name)],
            [t('booking.hospital'), l(booked.hospital.name)],
            [
              t('booking.date'),
              d(booked.slot.start, { weekday: 'long', day: 'numeric', month: 'long' }),
            ],
            [t('booking.time'), formatTime(booked.slot.start, lang)],
          ]}
        />
      </Modal>
    );
  }

  if (!slot) return null;

  if (!isLoggedIn) {
    return (
      <LoginPrompt
        open
        onClose={onClose}
        title={t('booking.loginTitle')}
        body={t('booking.loginBody')}
      />
    );
  }

  const left = slot.capacity - slot.booked;
  const submit = handleSubmit(({ patientName }) => {
    setError(null);
    book.mutate(
      { slotId: slot.slotId, patientName },
      {
        onSuccess: (appointment) => setBooked(appointment),
        onError: (err) => setError(bookingErrorKey(err)),
      },
    );
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t('booking.confirmTitle')}
      footer={
        error === 'SLOT_FULL' ? (
          <Button onClick={onClose}>{t('booking.chooseAnother')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="booking-form"
              loading={book.isPending}
              disabled={!user.data}
            >
              {t('booking.confirm')}
            </Button>
          </>
        )
      }
    >
      <SummaryRows
        rows={[
          [t('booking.doctor'), l(doctor.name)],
          [t('booking.hospital'), l(hospital.name)],
          [t('booking.date'), d(slot.start, { weekday: 'long', day: 'numeric', month: 'long' })],
          [t('booking.time'), formatTime(slot.start, lang)],
          [
            t('booking.places'),
            t('booking.placesLeft', { left: n(left), total: n(slot.capacity) }),
          ],
        ]}
      />
      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-2xl bg-[#FBE3E4] p-3 text-sm text-[#8E1F23]"
        >
          <CircleAlert aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
          {errorText(error)}
        </p>
      )}
      {error !== 'SLOT_FULL' && (
        <form id="booking-form" noValidate onSubmit={submit} className="mt-4">
          {user.isPending ? (
            <Skeleton shape="rect" className="h-20" />
          ) : (
            <Input
              label={t('booking.patientName')}
              hint={t('booking.patientNameHint')}
              autoComplete="name"
              error={errors.patientName ? t('booking.patientNameError') : undefined}
              {...register('patientName')}
            />
          )}
        </form>
      )}
    </Modal>
  );
}
