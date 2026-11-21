/** Bed-count rules shared by the staff form and the mock API (bed update). */
export type BedError = 'notWhole' | 'negative' | 'overTotal';

/** A count is valid when it is a whole number from 0 to the ward total. */
export function validateBedCount(value: number, total: number): BedError | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return 'notWhole';
  if (value < 0) return 'negative';
  if (value > total) return 'overTotal';
  return null;
}

/** Keep a stepper value inside 0..total. */
export function clampBeds(value: number, total: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(total, Math.max(0, Math.round(value)));
}
