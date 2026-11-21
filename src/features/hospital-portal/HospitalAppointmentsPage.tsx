import { useState } from 'react';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { useHospitalAppointments, useSetAppointmentStatus } from '@/api/staffQueries';
import type { HospitalAppointment } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useStaffError } from '@/components/useStaffError';
import { StatusBadge } from '@/features/appointments/StatusBadge';
import { Button, Card, DataTable, EmptyState, SkeletonCard, useToast } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

/** Today's appointments: serial, patient, time, status; mark Completed or Missed. */
export default function HospitalAppointmentsPage() {
  const { t, l, n, d, lang } = useLocale();
  const query = useHospitalAppointments();
  const setStatus = useSetAppointmentStatus();
  const toast = useToast();
  const showError = useStaffError();
  const [missing, setMissing] = useState<HospitalAppointment | null>(null);

  const mark = (row: HospitalAppointment, status: 'completed' | 'missed') =>
    setStatus.mutate(
      { appointmentId: row.appointmentId, status },
      {
        onSuccess: () => {
          toast({
            tone: 'success',
            message: t(
              status === 'completed'
                ? 'staff.appointments.markedCompleted'
                : 'staff.appointments.markedMissed',
              {
                serial: n(row.serialNo),
              },
            ),
          });
          setMissing(null);
        },
        onError: showError,
      },
    );

  return (
    <>
      <PageHeader
        title={t('staff.appointments.title')}
        subtitle={d(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
      />
      <Card title={t('staff.appointments.listTitle')} icon={ClipboardList} titleAs="h2">
        <QueryState
          query={query}
          skeleton={<SkeletonCard />}
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={ClipboardList}
              title={t('staff.appointments.emptyTitle')}
              message={t('staff.appointments.emptyMessage')}
            />
          }
        >
          {(rows) => (
            <DataTable
              caption={t('staff.appointments.listTitle')}
              rows={rows}
              rowKey={(r) => r.appointmentId}
              columns={[
                {
                  key: 'serial',
                  header: t('staff.appointments.serial'),
                  cell: (r) => n(r.serialNo),
                },
                {
                  key: 'patient',
                  header: t('staff.appointments.patient'),
                  primary: true,
                  cell: (r) => r.patientName,
                },
                {
                  key: 'time',
                  header: t('staff.appointments.time'),
                  cell: (r) => formatTime(r.start, lang),
                },
                {
                  key: 'doctor',
                  header: t('staff.appointments.doctor'),
                  cell: (r) => l(r.doctorName),
                },
                {
                  key: 'status',
                  header: t('staff.common.status'),
                  cell: (r) => <StatusBadge status={r.status} />,
                },
              ]}
              actions={(r) =>
                r.status === 'booked' ? (
                  <>
                    <Button
                      size="sm"
                      leadingIcon={CheckCircle2}
                      loading={
                        setStatus.isPending &&
                        setStatus.variables?.appointmentId === r.appointmentId &&
                        setStatus.variables.status === 'completed'
                      }
                      onClick={() => mark(r, 'completed')}
                      aria-label={t('staff.appointments.completeNamed', { serial: n(r.serialNo) })}
                    >
                      {t('staff.appointments.complete')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={XCircle}
                      onClick={() => setMissing(r)}
                      aria-label={t('staff.appointments.missedNamed', { serial: n(r.serialNo) })}
                    >
                      {t('staff.appointments.missed')}
                    </Button>
                  </>
                ) : null
              }
            />
          )}
        </QueryState>
      </Card>
      <ConfirmDialog
        open={missing !== null}
        title={t('staff.appointments.missedTitle')}
        message={t('staff.appointments.missedBody', {
          serial: missing ? n(missing.serialNo) : '',
          name: missing?.patientName ?? '',
        })}
        confirmLabel={t('staff.appointments.missed')}
        loading={setStatus.isPending}
        onClose={() => setMissing(null)}
        onConfirm={() => missing && mark(missing, 'missed')}
      />
    </>
  );
}
