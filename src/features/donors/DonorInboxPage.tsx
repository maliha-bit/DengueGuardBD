import { useState } from 'react';
import { Check, Droplet, Flag, HeartHandshake, Hospital, Inbox, Phone, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDonorInbox,
  useMyDonorProfile,
  useReportDonorMisuse,
  useRespondToDonorRequest,
} from '@/api/queries';
import type { DonorRequest, MisuseReason } from '@/api/types';
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
  Input,
  Modal,
  Select,
  SkeletonCard,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { isInRecovery } from '@/lib/donorRules';
import { formatTime, localDigits } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { DonorTabs } from './DonorTabs';
import { useRequestTimeline } from './useRequestTimeline';

const MISUSE_REASONS: MisuseReason[] = ['fake', 'spam', 'abusive', 'payment', 'other'];

/** Incoming requests for the donor (UC26–UC28). */
export default function DonorInboxPage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('donors.inbox.title')} message={t('donors.inbox.loginMessage')}>
      <DonorInbox />
    </RequireLogin>
  );
}

function DonorInbox() {
  const { t } = useLocale();
  const profile = useMyDonorProfile();
  return (
    <>
      <PageHeader title={t('donors.inbox.title')} subtitle={t('donors.inbox.subtitle')} />
      <DonorTabs />
      <QueryState
        query={profile}
        skeleton={<SkeletonCard />}
        empty={
          <Card>
            <EmptyState
              icon={HeartHandshake}
              title={t('donors.inbox.notDonorTitle')}
              message={t('donors.inbox.notDonorMessage')}
              action={
                <Link to="/donor/profile" className={buttonClasses({ size: 'sm' })}>
                  {t('donors.inbox.becomeDonor')}
                </Link>
              }
            />
          </Card>
        }
      >
        {(donor) => (
          <InboxList recovering={isInRecovery(donor.donationType, donor.lastDonationDate)} />
        )}
      </QueryState>
    </>
  );
}

function InboxList({ recovering }: { recovering: boolean }) {
  const { t } = useLocale();
  const query = useDonorInbox();
  return (
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
            icon={Inbox}
            title={t('donors.inbox.emptyTitle')}
            message={t('donors.inbox.emptyMessage')}
          />
        </Card>
      }
    >
      {(list) => (
        <ul className="grid gap-4">
          {list.map((request) => (
            <li key={request.requestId}>
              <InboxCard request={request} recovering={recovering} />
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

function InboxCard({ request, recovering }: { request: DonorRequest; recovering: boolean }) {
  const { t, l, n, d, lang } = useLocale();
  const toast = useToast();
  const respond = useRespondToDonorRequest();
  const timeline = useRequestTimeline(request);
  const [checking, setChecking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const neededBy = `${d(request.neededBy, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(request.neededBy, lang)}`;

  const answer = (accept: boolean) =>
    respond.mutate(
      { requestId: request.requestId, accept },
      {
        onSuccess: () => {
          setChecking(false);
          toast({
            tone: 'success',
            message: accept ? t('donors.inbox.acceptedToast') : t('donors.inbox.declinedToast'),
          });
        },
        onError: () => toast({ tone: 'error', message: t('donors.request.error') }),
      },
    );

  return (
    <article
      aria-label={t('donors.inbox.cardLabel', {
        group: request.patientBloodGroup,
        hospital: l(request.hospital.name),
      })}
      className="rounded-3xl bg-white p-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Badge tone="risk-high" icon={Droplet} size="md">
          {request.patientBloodGroup}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-medium">
            <Hospital aria-hidden="true" className="h-4 w-4" />
            {l(request.hospital.name)}
          </p>
          <p className="text-sm text-brand-muted">
            {t('donors.inbox.details', { units: n(request.unitsNeeded), time: neededBy })}
          </p>
          <p className="text-sm text-brand-muted">
            {t('donors.inbox.from', { name: l(request.requesterName) })}
          </p>
          {request.note && <p className="mt-1 text-sm">“{request.note}”</p>}
        </div>
        <Badge tone="neutral">{t(`donors.status.${request.status}`)}</Badge>
      </div>

      <div className="mt-4">
        <StatusTimeline {...timeline} />
      </div>

      {request.contactPhone && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-lime-soft p-3 text-sm">
          <p className="flex-1">
            <span className="block text-xs text-brand-muted">
              {t('donors.inbox.requesterContact')}
            </span>
            <span className="font-semibold" data-testid="requester-phone">
              {localDigits(request.contactPhone, lang)}
            </span>
          </p>
          <a
            href={`tel:${request.contactPhone}`}
            className={buttonClasses({ variant: 'dark', size: 'sm' })}
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            {t('hospitals.call')}
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {request.status === 'sent' && (
          <>
            <Button size="sm" leadingIcon={Check} onClick={() => setChecking(true)}>
              {t('donors.inbox.accept')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={X}
              loading={respond.isPending && !checking}
              onClick={() => answer(false)}
            >
              {t('donors.inbox.decline')}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={Flag}
          className="ml-auto"
          onClick={() => setReporting(true)}
        >
          {t('donors.misuse.button')}
        </Button>
      </div>

      {checking && (
        <EligibilityModal
          recovering={recovering}
          loading={respond.isPending}
          onClose={() => setChecking(false)}
          onConfirm={() => answer(true)}
        />
      )}
      {reporting && (
        <MisuseModal requestId={request.requestId} onClose={() => setReporting(false)} />
      )}
    </article>
  );
}

function EligibilityModal({
  recovering,
  loading,
  onClose,
  onConfirm,
}: {
  recovering: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();
  const [ok, setOk] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('donors.eligibility.title')}
      description={t('donors.eligibility.body')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            leadingIcon={Check}
            disabled={!ok || recovering}
            loading={loading}
            onClick={onConfirm}
          >
            {t('donors.eligibility.confirm')}
          </Button>
        </>
      }
    >
      {recovering && (
        <p role="alert" className="mb-3 rounded-2xl bg-[#FCF0D6] p-3 text-sm text-[#6B4A06]">
          {t('donors.eligibility.recovering')}
        </p>
      )}
      <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-2xl bg-brand-canvas px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-ink"
        />
        {t('donors.eligibility.check')}
      </label>
    </Modal>
  );
}

function MisuseModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { t } = useLocale();
  const toast = useToast();
  const report = useReportDonorMisuse();
  const [reason, setReason] = useState<MisuseReason | ''>('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = () => {
    setTouched(true);
    if (!reason) return;
    report.mutate(
      { requestId, reason, note: note.trim() },
      {
        onSuccess: () => {
          toast({ tone: 'success', message: t('donors.misuse.sent') });
          onClose();
        },
        onError: () => toast({ tone: 'error', message: t('donors.request.error') }),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('donors.misuse.title')}
      description={t('donors.misuse.body')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" leadingIcon={Flag} loading={report.isPending} onClick={submit}>
            {t('donors.misuse.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label={t('donors.misuse.reason')}
          placeholder={t('common.selectPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value as MisuseReason)}
          error={touched && !reason ? t('donors.misuse.reasonError') : undefined}
          options={MISUSE_REASONS.map((r) => ({
            value: r,
            label: t(`donors.misuse.reasons.${r}`),
          }))}
        />
        <Input
          label={t('donors.misuse.note')}
          optional
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
