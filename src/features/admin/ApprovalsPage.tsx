import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, UserCheck, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDecideSignup, useSignups } from '@/api/staffQueries';
import type { StaffSignup } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
  SkeletonCard,
  Textarea,
  useToast,
} from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

const rejectSchema = z.object({ reason: z.string().trim().min(5, 'tooShort').max(300, 'tooLong') });
type RejectForm = z.infer<typeof rejectSchema>;

/** Staff sign-up requests: Approve, or Reject with a reason. */
export default function ApprovalsPage() {
  const { t, l, d } = useLocale();
  const query = useSignups();
  const decide = useDecideSignup();
  const toast = useToast();
  const showError = useStaffError();
  const [rejecting, setRejecting] = useState<StaffSignup | null>(null);

  const approve = (signup: StaffSignup) =>
    decide.mutate(
      { signupId: signup.signupId, approve: true, reason: '' },
      {
        onSuccess: () =>
          toast({
            tone: 'success',
            message: t('staff.approvals.approved', { name: l(signup.name) }),
          }),
        onError: showError,
      },
    );

  const columns = [
    {
      key: 'name',
      header: t('staff.approvals.name'),
      primary: true,
      cell: (s: StaffSignup) => l(s.name),
    },
    {
      key: 'role',
      header: t('staff.approvals.role'),
      cell: (s: StaffSignup) => t(`roles.${s.role}`),
    },
    {
      key: 'org',
      header: t('staff.approvals.organisation'),
      cell: (s: StaffSignup) => l(s.organisation),
    },
    {
      key: 'doc',
      header: t('staff.approvals.idDocument'),
      cell: (s: StaffSignup) => (
        <span className="inline-flex items-center gap-1.5">
          <FileText aria-hidden="true" className="h-4 w-4 text-brand-muted" />
          {s.idDocument}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('staff.approvals.submitted'),
      cell: (s: StaffSignup) =>
        d(s.submittedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    },
  ];

  return (
    <>
      <PageHeader title={t('staff.approvals.title')} subtitle={t('staff.approvals.subtitle')} />
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        isEmpty={(list) => list.length === 0}
        empty={
          <Card>
            <EmptyState icon={UserCheck} title={t('staff.approvals.emptyTitle')} />
          </Card>
        }
      >
        {(signups) => {
          const pending = signups.filter((s) => s.status === 'pending');
          const decided = signups.filter((s) => s.status !== 'pending');
          return (
            <div className="flex flex-col gap-4">
              <Card title={t('staff.approvals.pendingTitle')} icon={UserCheck} titleAs="h2">
                {pending.length === 0 ? (
                  <EmptyState compact icon={UserCheck} title={t('staff.approvals.noPending')} />
                ) : (
                  <DataTable
                    caption={t('staff.approvals.pendingTitle')}
                    rows={pending}
                    rowKey={(s) => s.signupId}
                    columns={columns}
                    actions={(s) => (
                      <>
                        <Button
                          size="sm"
                          leadingIcon={Check}
                          loading={decide.isPending && decide.variables?.signupId === s.signupId}
                          aria-label={t('staff.approvals.approveNamed', { name: l(s.name) })}
                          onClick={() => approve(s)}
                        >
                          {t('staff.approvals.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leadingIcon={X}
                          aria-label={t('staff.approvals.rejectNamed', { name: l(s.name) })}
                          onClick={() => setRejecting(s)}
                        >
                          {t('staff.approvals.reject')}
                        </Button>
                      </>
                    )}
                  />
                )}
              </Card>
              {decided.length > 0 && (
                <Card title={t('staff.approvals.decidedTitle')} titleAs="h2">
                  <DataTable
                    caption={t('staff.approvals.decidedTitle')}
                    rows={decided}
                    rowKey={(s) => s.signupId}
                    columns={[
                      ...columns.slice(0, 3),
                      {
                        key: 'status',
                        header: t('staff.common.status'),
                        cell: (s: StaffSignup) => (
                          <span className="flex flex-col gap-0.5">
                            <Badge tone={s.status === 'approved' ? 'lime' : 'neutral'}>
                              {t(`staff.approvals.status.${s.status}`)}
                            </Badge>
                            {s.rejectReason && (
                              <span className="text-xs text-brand-muted">{s.rejectReason}</span>
                            )}
                          </span>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
          );
        }}
      </QueryState>
      {rejecting && <RejectModal signup={rejecting} onClose={() => setRejecting(null)} />}
    </>
  );
}

function RejectModal({ signup, onClose }: { signup: StaffSignup; onClose: () => void }) {
  const { t, l } = useLocale();
  const decide = useDecideSignup();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const { register, handleSubmit, formState } = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  });
  const onSubmit = handleSubmit(({ reason }) =>
    decide.mutate(
      { signupId: signup.signupId, approve: false, reason },
      {
        onSuccess: () => {
          toast({
            tone: 'success',
            message: t('staff.approvals.rejected', { name: l(signup.name) }),
          });
          onClose();
        },
        onError: showError,
      },
    ),
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={t('staff.approvals.rejectTitle', { name: l(signup.name) })}
      description={t('staff.approvals.rejectBody')}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Textarea
          label={t('staff.approvals.reason')}
          {...register('reason')}
          error={fieldError(formState.errors.reason?.message)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={decide.isPending}>
            {t('staff.approvals.reject')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
