import type { BreedingReportStatus, BreedingSiteType } from '@/api/types';
import type { TimelineStep } from '@/components/StatusTimeline';

export const SITE_TYPES: BreedingSiteType[] = [
  'standing_water',
  'drain',
  'tyres',
  'construction',
  'other',
];

export const PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoError = 'type' | 'size';

/** Only JPG or PNG up to 5 MB. Returns the problem, or null when the file is fine. */
export function validatePhoto(file: Pick<File, 'type' | 'size' | 'name'>): PhotoError | null {
  const typeOk = (PHOTO_TYPES as readonly string[]).includes(file.type);
  const extensionOk = /\.(jpe?g|png)$/i.test(file.name);
  if (!typeOk || !extensionOk) return 'type';
  if (file.size > MAX_PHOTO_BYTES) return 'size';
  return null;
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** Submitted → Under review → Action taken / Rejected. */
export function reportTimeline(
  status: BreedingReportStatus,
  labels: Record<BreedingReportStatus | 'outcome', string>,
  times: { createdAt: string; updatedAt: string },
): TimelineStep[] {
  const reviewed = status === 'action_taken' || status === 'rejected';
  return [
    { key: 'submitted', label: labels.submitted, state: 'done', time: times.createdAt },
    {
      key: 'review',
      label: labels.under_review,
      state: status === 'submitted' ? 'upcoming' : status === 'under_review' ? 'current' : 'done',
    },
    {
      key: 'outcome',
      label: reviewed ? labels[status] : labels.outcome,
      state: status === 'action_taken' ? 'done' : status === 'rejected' ? 'failed' : 'upcoming',
      time: reviewed ? times.updatedAt : undefined,
    },
  ];
}
