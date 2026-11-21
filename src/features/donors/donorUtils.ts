import type {
  BloodGroup,
  DonationType,
  DonorListing,
  DonorRequest,
  DonorRequestStatus,
} from '@/api/types';
import type { TimelineStep } from '@/components/StatusTimeline';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const DONATION_TYPES: DonationType[] = ['whole_blood', 'platelets', 'both'];

export interface DonorFilters {
  bloodGroup: BloodGroup | '';
  /** "whole_blood" also matches donors who give both; same for "platelets". */
  donationType: DonationType | '';
  districtId: string;
  availableOnly: boolean;
}

export const EMPTY_DONOR_FILTERS: DonorFilters = {
  bloodGroup: '',
  donationType: '',
  districtId: '',
  availableOnly: false,
};

export function matchesDonor(donor: DonorListing, f: DonorFilters): boolean {
  if (f.bloodGroup && donor.bloodGroup !== f.bloodGroup) return false;
  if (f.districtId && donor.districtId !== f.districtId) return false;
  if (f.availableOnly && !donor.available) return false;
  if (f.donationType && f.donationType !== 'both') {
    if (donor.donationType !== f.donationType && donor.donationType !== 'both') return false;
  }
  if (f.donationType === 'both' && donor.donationType !== 'both') return false;
  return true;
}

/** Available donors first, then most recently active. */
export const sortDonors = (donors: DonorListing[]) =>
  [...donors].sort(
    (a, b) =>
      Number(b.available) - Number(a.available) || b.lastActiveAt.localeCompare(a.lastActiveAt),
  );

type StepKey = 'sent' | 'response' | 'outcome';

/**
 * Request timeline: Sent → Accepted / Declined → Fulfilled / Expired.
 * `labels` maps each status to its text.
 */
export function requestTimeline(
  request: Pick<DonorRequest, 'status' | 'createdAt' | 'respondedAt' | 'closedAt'>,
  labels: Record<DonorRequestStatus | 'waiting' | 'done', string>,
  formatTime: (iso: string) => string,
): TimelineStep[] {
  const { status, respondedAt, closedAt, createdAt } = request;
  const responded = respondedAt !== null;
  const steps: Record<StepKey, TimelineStep> = {
    sent: { key: 'sent', label: labels.sent, state: 'done', time: formatTime(createdAt) },
    response: { key: 'response', label: labels.waiting, state: 'current' },
    outcome: { key: 'outcome', label: labels.done, state: 'upcoming' },
  };
  if (status === 'declined') {
    steps.response = {
      key: 'response',
      label: labels.declined,
      state: 'failed',
      time: respondedAt ? formatTime(respondedAt) : undefined,
    };
  } else if (responded || status === 'accepted' || status === 'fulfilled') {
    steps.response = {
      key: 'response',
      label: labels.accepted,
      state: status === 'accepted' ? 'current' : 'done',
      time: respondedAt ? formatTime(respondedAt) : undefined,
    };
  }
  if (status === 'fulfilled') {
    steps.outcome = {
      key: 'outcome',
      label: labels.fulfilled,
      state: 'done',
      time: closedAt ? formatTime(closedAt) : undefined,
    };
  } else if (status === 'expired') {
    if (!responded) steps.response = { key: 'response', label: labels.waiting, state: 'upcoming' };
    steps.outcome = { key: 'outcome', label: labels.expired, state: 'failed' };
  }
  return status === 'declined'
    ? [steps.sent, steps.response]
    : [steps.sent, steps.response, steps.outcome];
}

/** Bangladeshi mobile number: 11 digits starting 013–019 (Bangla digits allowed). */
export function normalizePhone(value: string): string {
  return value
    .replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
    .replace(/[^0-9+]/g, '')
    .replace(/^\+?88/, '');
}

export const isValidBdMobile = (value: string) => /^01[3-9][0-9]{8}$/.test(normalizePhone(value));
