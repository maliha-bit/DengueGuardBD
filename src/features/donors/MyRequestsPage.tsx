import { CheckCheck, Droplet, Hospital, Phone, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarkDonorRequestFulfilled, useMyDonorRequests } from '@/api/queries';
import type { DonorRequest } from '@/api/types';
import { RequireLogin } from '@/app/RequireLogin';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { StatusTimeline } from '@/components/StatusTimeline';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  SkeletonCard,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { formatTime, localDigits } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { DonorTabs } from './DonorTabs';
import { useRequestTimeline } from './useRequestTimeline';

/** Requests the user sent to donors, with status timelines (UC23). */
export default function MyRequestsPage() {
  const { t } = useLocale();
  return (
    <RequireLogin
      title={t('donors.myRequests.title')}
      message={t('donors.myRequests.loginMessage')}
    >
      <MyRequests />
    </RequireLogin>
  );
}

function MyRequests() {
  const { t } = useLocale();
  const query = useMyDonorRequests();
  return (
    <>
      <PageHeader title={t('donors.myRequests.title')} subtitle={t('donors.myRequests.subtitle')} />
      <DonorTabs />
      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        isEmpty={(list) => list.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={Send}
              title={t('donors.myRequests.emptyTitle')}
              message={t('donors.myRequests.emptyMessage')}
              action={
                <Link to="/donors" className={buttonClasses({ size: 'sm' })}>
                  {t('donors.tabs.find')}
                </Link>
              }
            />
          </Card>
        }
      >
        {(list) => (
          <ul className="grid gap-4">
            {list.map((request) => (
              <li key={request.requestId}>
                <RequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}

function RequestCard({ request }: { request: DonorRequest }) {
  const { t, l, n, d, lang } = useLocale();
  const toast = useToast();
  const fulfil = useMarkDonorRequestFulfilled();
  const timeline = useRequestTimeline(request);
  const neededBy = `${d(request.neededBy, { day: 'numeric', month: 'short' })}, ${formatTime(request.neededBy, lang)}`;

  return (
    <article
      aria-label={t('donors.myRequests.cardLabel', { group: request.patientBloodGroup })}
      className="rounded-3xl bg-white p-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FBE3E4] text-[#8E1F23]"
        >
          <Droplet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {t('donors.myRequests.toDonor', {
              group: request.donor.bloodGroup,
              district: l(request.donor.district),
            })}
            <Badge tone="neutral">{t(`donors.status.${request.status}`)}</Badge>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-muted">
            <Hospital aria-hidden="true" className="h-4 w-4" />
            {l(request.hospital.name)}
          </p>
          <p className="text-sm text-brand-muted">
            {t('donors.myRequests.details', {
              group: request.patientBloodGroup,
              units: n(request.unitsNeeded),
              time: neededBy,
            })}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <StatusTimeline {...timeline} />
      </div>

      <div className="mt-4 rounded-2xl bg-brand-canvas p-3 text-sm">
        {request.donorPhone ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1">
              <span className="block text-xs text-brand-muted">
                {t('donors.myRequests.donorContact')}
              </span>
              <span className="font-semibold" data-testid="donor-phone">
                {localDigits(request.donorPhone, lang)}
              </span>
            </p>
            <a
              href={`tel:${request.donorPhone}`}
              className={buttonClasses({ variant: 'dark', size: 'sm' })}
            >
              <Phone aria-hidden="true" className="h-4 w-4" />
              {t('hospitals.call')}
            </a>
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{localDigits(request.donor.maskedPhone, lang)}</span>
            <span className="text-brand-muted">{t('donors.myRequests.contactHidden')}</span>
          </p>
        )}
      </div>

      {request.status === 'accepted' && (
        <Button
          className="mt-3"
          variant="secondary"
          size="sm"
          leadingIcon={CheckCheck}
          loading={fulfil.isPending}
          onClick={() =>
            fulfil.mutate(request.requestId, {
              onSuccess: () =>
                toast({ tone: 'success', message: t('donors.myRequests.fulfilledToast') }),
              onError: () => toast({ tone: 'error', message: t('donors.request.error') }),
            })
          }
        >
          {t('donors.myRequests.markFulfilled')}
        </Button>
      )}
    </article>
  );
}
