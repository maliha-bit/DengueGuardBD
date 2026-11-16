import type { Doctor, Weekday } from '@/api/types';
import { toIsoDate } from '@/lib/format';

/** Today and the next 6 days as yyyy-mm-dd. */
export function nextSevenDays(now: Date = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    return toIsoDate(day);
  });
}

const weekdayOf = (isoDate: string) => {
  const [y = 1970, m = 1, d = 1] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() as Weekday;
};

export const isDoctorAvailable = (doctor: Doctor, isoDate: string) =>
  doctor.availableDays.includes(weekdayOf(isoDate));

/** First of the next 7 days the doctor works. */
export const firstAvailableDate = (doctor: Doctor) =>
  nextSevenDays().find((day) => isDoctorAvailable(doctor, day)) ?? null;
