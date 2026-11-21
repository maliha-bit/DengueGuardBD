import type { DonationType } from '@/api/types';
import { parseIsoDate, toIsoDate } from './format';

/**
 * Minimum days between donations (simulated programme rules, to be confirmed with the
 * blood transfusion service): whole blood 90 days, platelets 7 days. "Both" follows the
 * stricter whole-blood rule.
 */
export const RECOVERY_DAYS: Record<DonationType, number> = {
  whole_blood: 90,
  platelets: 7,
  both: 90,
};

/** First date (yyyy-mm-dd) the donor may donate again; null if they never donated. */
export function nextEligibleDate(type: DonationType, lastDonation: string | null): string | null {
  if (!lastDonation) return null;
  const date = parseIsoDate(lastDonation);
  date.setDate(date.getDate() + RECOVERY_DAYS[type]);
  return toIsoDate(date);
}

/** True while the donor is still inside the recovery period. */
export function isInRecovery(
  type: DonationType,
  lastDonation: string | null,
  now: Date = new Date(),
): boolean {
  const next = nextEligibleDate(type, lastDonation);
  return next !== null && next > toIsoDate(now);
}
