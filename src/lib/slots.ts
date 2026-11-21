/**
 * Slot rules for the hospital slot generator: build slots from a doctor's weekly schedule
 * and block any slot that overlaps one already published (or another new one).
 */
import type {
  SlotDraft,
  SlotGeneratorInput,
  TimeRange,
  Weekday,
  WeeklyScheduleDay,
} from '@/api/types';
import { parseIsoDate, toIsoDate } from './format';

/** Saturday first (the working week in Bangladesh); Friday last. */
export const WEEK_ORDER: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

/** "09:30" → 570 */
export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 570 → "09:30" */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Half-open intervals [aStart, aEnd) and [bStart, bEnd): touching ends do not overlap. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** True when a range ends before it starts, or two ranges of one day overlap. */
export function hasInvalidRanges(ranges: TimeRange[]): boolean {
  const parsed = ranges.map((r) => [toMinutes(r.start), toMinutes(r.end)] as const);
  if (parsed.some(([start, end]) => end <= start)) return true;
  return parsed.some(([aStart, aEnd], i) =>
    parsed.some(([bStart, bEnd], j) => i < j && rangesOverlap(aStart, aEnd, bStart, bEnd)),
  );
}

function atMinutes(isoDate: string, minutes: number): Date {
  const date = parseIsoDate(isoDate);
  date.setMinutes(minutes);
  return date;
}

export const MAX_GENERATOR_DAYS = 14;

/** Calendar days from `from` to `to`, inclusive (0 when `to` is before `from`). */
export function daysInRange(from: string, to: string): number {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return ms < 0 ? 0 : Math.round(ms / 86_400_000) + 1;
}

/** Slots of `slotMinutes` that fit fully inside each schedule range, for each day in the range. */
export function generateSlots(
  input: SlotGeneratorInput,
  schedule: WeeklyScheduleDay[],
): SlotDraft[] {
  const drafts: SlotDraft[] = [];
  if (input.slotMinutes <= 0) return drafts;
  const days = Math.min(daysInRange(input.from, input.to), MAX_GENERATOR_DAYS);
  for (let i = 0; i < days; i++) {
    const date = parseIsoDate(input.from);
    date.setDate(date.getDate() + i);
    const iso = toIsoDate(date);
    const weekday = date.getDay() as Weekday;
    const ranges = schedule.find((s) => s.day === weekday)?.ranges ?? [];
    for (const range of ranges) {
      const end = toMinutes(range.end);
      for (let t = toMinutes(range.start); t + input.slotMinutes <= end; t += input.slotMinutes) {
        drafts.push({
          doctorId: input.doctorId,
          start: atMinutes(iso, t).toISOString(),
          end: atMinutes(iso, t + input.slotMinutes).toISOString(),
          capacity: input.capacity,
        });
      }
    }
  }
  return drafts;
}

interface Timed {
  doctorId: string;
  start: string;
  end: string;
}

const clash = (a: Timed, b: Timed) =>
  a.doctorId === b.doctorId &&
  rangesOverlap(
    new Date(a.start).getTime(),
    new Date(a.end).getTime(),
    new Date(b.start).getTime(),
    new Date(b.end).getTime(),
  );

/** New slots that clash with a published slot of the same doctor, or with each other. */
export function findOverlaps<T extends Timed>(drafts: T[], existing: Timed[]): T[] {
  return drafts.filter(
    (draft, i) =>
      existing.some((slot) => clash(draft, slot)) ||
      drafts.some((other, j) => i !== j && clash(draft, other)),
  );
}
