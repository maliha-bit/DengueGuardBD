import type { Appointment } from '@/api/types';

/** Upcoming = still booked and in the future; everything else is history. */
export function isUpcoming(appointment: Appointment, now: Date = new Date()) {
  return appointment.status === 'booked' && new Date(appointment.slot.start) > now;
}
