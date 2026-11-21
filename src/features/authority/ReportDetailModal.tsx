import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageOff, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSetReportStatus } from '@/api/staffQueries';
import type { AuthorityReport, BreedingReportStatus } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import { Badge, Button, Modal, Select, Textarea, useToast } from '@/components/ui';
import { localDigits } from '@/lib/format';
import { REPORT_TRANSITIONS } from '@/lib/reports';
import { useLocale } from '@/lib/useLocale';

const statusSchema = z
  .object({ status: z.string().min(1, 'required'), note: z.string().trim().max(300, 'tooLong') })
  .refine((v) => v.status !== 'rejected' || v.note.length >= 3, {
    message: 'required',
    path: ['note'],
  });
type StatusForm = z.infer<typeof statusSchema>;

/** One report: photo, details and the status change (Under review → Action taken / Rejected). */
export function ReportDetailModal({
  report,
  onClose,
}: {
  report: AuthorityReport;
  onClose: () => void;
}) {
  const { t, l, n, d, lang } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const update = useSetReportStatus();
  const next = REPORT_TRANSITIONS[report.status];
  const [confirmReject, setConfirmReject] = useState<StatusForm | null>(null);
  const { register, handleSubmit, formState } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: next[0] ?? '', note: '' },
  });

  const save = (values: StatusForm) =>
    update.mutate(
      {
        reportId: report.reportId,
        status: values.status as BreedingReportStatus,
        note: values.note,
      },
      {
        onSuccess: (saved) => {
          toast({
            tone: 'success',
            message: t('staff.reports.statusSaved', {
              reference: localDigits(saved.reference, lang),
              status: t(`reports.status.${saved.status}`),
            }),
          });
          setConfirmReject(null);
          onClose();
        },
        onError: showError,
      },
    );
  const onSubmit = handleSubmit((values) =>
    values.status === 'rejected' ? setConfirmReject(values) : save(values),
  );

  return (
    <>
      <Modal open={confirmReject === null} onClose={onClose} title={report.areaName} size="lg">
        <div className="flex flex-col gap-4 sm:flex-row">
          {report.photoUrl ? (
            <img
              src={report.photoUrl}
              alt={t('reports.list.photoAlt', { area: report.areaName })}
              className="h-44 w-full shrink-0 rounded-2xl object-cover sm:w-56"
            />
          ) : (
            <span className="flex h-44 w-full shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-brand-canvas text-xs text-brand-muted sm:w-56">
              <ImageOff aria-hidden="true" className="h-6 w-6" />
              {t('reports.list.noPhoto')}
            </span>
          )}
          <dl className="grid flex-1 grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-brand-muted">{t('staff.reports.reference')}</dt>
            <dd>{localDigits(report.reference, lang)}</dd>
            <dt className="text-brand-muted">{t('staff.common.status')}</dt>
            <dd>
              <Badge tone={report.status === 'rejected' ? 'neutral' : 'lime'}>
                {t(`reports.status.${report.status}`)}
              </Badge>
            </dd>
            <dt className="text-brand-muted">{t('staff.reports.siteType')}</dt>
            <dd>{t(`reports.siteTypes.${report.siteType}`)}</dd>
            <dt className="text-brand-muted">{t('staff.reports.district')}</dt>
            <dd>{l(report.district)}</dd>
            <dt className="text-brand-muted">{t('staff.reports.date')}</dt>
            <dd>
              {d(report.createdAt, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </dd>
            <dt className="text-brand-muted">{t('staff.reports.location')}</dt>
            <dd className="flex items-center gap-1">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {n(report.location[0], { maximumFractionDigits: 4 })},{' '}
              {n(report.location[1], { maximumFractionDigits: 4 })}
            </dd>
            {report.note && (
              <>
                <dt className="text-brand-muted">{t('staff.reports.citizenNote')}</dt>
                <dd>{report.note}</dd>
              </>
            )}
            {report.statusNote && (
              <>
                <dt className="text-brand-muted">{t('staff.reports.statusNote')}</dt>
                <dd>{report.statusNote}</dd>
              </>
            )}
          </dl>
        </div>

        {next.length > 0 ? (
          <form
            onSubmit={onSubmit}
            noValidate
            className="mt-5 grid gap-3 rounded-2xl bg-brand-canvas p-4"
          >
            <Select
              label={t('staff.reports.newStatus')}
              {...register('status')}
              options={next.map((s) => ({ value: s, label: t(`reports.status.${s}`) }))}
              error={fieldError(formState.errors.status?.message)}
            />
            <Textarea
              label={t('staff.reports.note')}
              hint={t('staff.reports.noteHint')}
              {...register('note')}
              error={fieldError(formState.errors.note?.message)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={update.isPending}>
                {t('staff.reports.saveStatus')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-5 text-sm text-brand-muted">{t('staff.reports.closed')}</p>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmReject !== null}
        title={t('staff.reports.rejectTitle')}
        message={t('staff.reports.rejectBody', { area: report.areaName })}
        confirmLabel={t('staff.reports.reject')}
        loading={update.isPending}
        onClose={() => setConfirmReject(null)}
        onConfirm={() => confirmReject && save(confirmReject)}
      />
    </>
  );
}
