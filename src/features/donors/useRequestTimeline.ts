import type { DonorRequest } from '@/api/types';
import type { TimelineStep, TimelineState } from '@/components/StatusTimeline';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { requestTimeline } from './donorUtils';

/** Localised props for <StatusTimeline> of a donor request. */
export function useRequestTimeline(request: DonorRequest): {
  steps: TimelineStep[];
  label: string;
  stateLabels: Record<TimelineState, string>;
} {
  const { t, d, lang } = useLocale();
  const steps = requestTimeline(
    request,
    {
      sent: t('donors.status.sent'),
      waiting: t('donors.timeline.waiting'),
      done: t('donors.timeline.outcome'),
      accepted: t('donors.status.accepted'),
      declined: t('donors.status.declined'),
      fulfilled: t('donors.status.fulfilled'),
      expired: t('donors.status.expired'),
    },
    (iso) => `${d(iso, { day: 'numeric', month: 'short' })}, ${formatTime(iso, lang)}`,
  );
  return {
    steps,
    label: t('donors.timeline.label'),
    stateLabels: {
      done: t('timeline.done'),
      current: t('timeline.current'),
      upcoming: t('timeline.upcoming'),
      failed: t('timeline.failed'),
    },
  };
}
