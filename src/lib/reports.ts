import type { BreedingReportStatus } from '@/api/types';

/** Allowed status changes for a breeding report (health authority review). */
export const REPORT_TRANSITIONS: Record<BreedingReportStatus, BreedingReportStatus[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['action_taken', 'rejected'],
  action_taken: [],
  rejected: [],
};

export const REPORT_STATUSES: BreedingReportStatus[] = [
  'submitted',
  'under_review',
  'action_taken',
  'rejected',
];
