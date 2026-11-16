import { isBookingError, type BookingErrorCode } from '@/api/errors';
import type { Appointment } from '@/api/types';
import { downloadIcs } from '@/lib/calendar';
import { useLocale } from '@/lib/useLocale';

export type ErrorKey = BookingErrorCode | 'generic';
const KNOWN_ERRORS: ErrorKey[] = [
  'SLOT_FULL',
  'DUPLICATE_BOOKING',
  'TIME_CONFLICT',
  'SLOT_IN_PAST',
];

export function bookingErrorKey(error: unknown): ErrorKey {
  return isBookingError(error) && KNOWN_ERRORS.includes(error.code) ? error.code : 'generic';
}

export function useBookingErrorText() {
  const { t } = useLocale();
  return (key: ErrorKey) =>
    t(`booking.errors.${KNOWN_ERRORS.includes(key) ? (key as 'SLOT_FULL') : 'generic'}`);
}

export function addToCalendar(appointment: Appointment, t: ReturnType<typeof useLocale>['t']) {
  downloadIcs(
    {
      uid: appointment.appointmentId,
      title: t('booking.calendarTitle', { doctor: appointment.doctor.name.en }),
      start: new Date(appointment.slot.start),
      durationMinutes: 30,
      location: `${appointment.hospital.name.en}, ${appointment.hospital.address.en}`,
      description: t('booking.calendarDescription', { serial: String(appointment.serialNo) }),
    },
    `appointment-${appointment.appointmentId}.ics`,
  );
}
