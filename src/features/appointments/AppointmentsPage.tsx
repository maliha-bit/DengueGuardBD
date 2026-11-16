import { useId, useState, type KeyboardEvent } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CircleAlert,
  Hash,
  History,
  Hospital,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppointments, useCancelAppointment, useRescheduleAppointment } from '@/api/queries';
import type { Appointment, Slot } from '@/api/types';
import { RequireLogin } from '@/app/RequireLogin';
import { Avatar } from '@/components/Avatar';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import {
  bookingErrorKey,
  useBookingErrorText,
  type ErrorKey,
} from '@/features/hospitals/bookingHelpers';
import { SlotPicker } from '@/features/hospitals/SlotPicker';
import { firstAvailableDate } from '@/features/hospitals/slotUtils';
import { SummaryRows } from '@/features/hospitals/SummaryRows';
import { isUpcoming } from './appointmentUtils';
import { StatusBadge } from './StatusBadge';

type Tab = 'upcoming' | 'past';

function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const { t, l, n, d, lang } = useLocale();
  const { doctor, hospital, slot } = appointment;
  return (
    <article className="flex flex-col rounded-3xl bg-white p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={doctor.name.en} tone="lime" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{l(doctor.name)}</h2>
          <p className="truncate text-xs text-brand-muted">
            {l(doctor.specialty)} · {l(hospital.name)}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand-canvas px-3">
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          {d(slot.start, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}{' '}
          · {formatTime(slot.start, lang)}
        </span>
        <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-lime px-3">
          <Hash aria-hidden="true" className="h-3.5 w-3.5" />
          {t('appointments.serial', {
            serial: n(appointment.serialNo, { minimumIntegerDigits: 2 }),
          })}
        </span>
      </div>
      {(onCancel || onReschedule) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onReschedule && (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={CalendarClock}
              onClick={onReschedule}
            >
              {t('appointments.reschedule')}
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" leadingIcon={CalendarX2} onClick={onCancel}>
              {t('appointments.cancel')}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function CancelDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { t, l, d, lang } = useLocale();
  const cancel = useCancelAppointment();
  const toast = useToast();
  const when = `${d(appointment.slot.start, { weekday: 'long', day: 'numeric', month: 'long' })}, ${formatTime(appointment.slot.start, lang)}`;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('appointments.cancelTitle')}
      description={t('appointments.cancelBody', { doctor: l(appointment.doctor.name), date: when })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('appointments.keep')}
          </Button>
          <Button
            variant="danger"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(appointment.appointmentId, {
                onSuccess: () => {
                  toast({ message: t('appointments.cancelled') });
                  onClose();
                },
                onError: () => toast({ message: t('booking.errors.generic'), tone: 'error' }),
              })
            }
          >
            {t('appointments.confirmCancel')}
          </Button>
        </>
      }
    />
  );
}

function RescheduleDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const { t, l, d, lang } = useLocale();
  const reschedule = useRescheduleAppointment();
  const toast = useToast();
  const errorText = useBookingErrorText();
  const [date, setDate] = useState<string | null>(() => firstAvailableDate(appointment.doctor));
  const [picked, setPicked] = useState<Slot | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const when = (start: string) =>
    `${d(start, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(start, lang)}`;

  const confirm = () => {
    if (!picked) return;
    setError(null);
    reschedule.mutate(
      { appointmentId: appointment.appointmentId, slotId: picked.slotId },
      {
        onSuccess: (updated) => {
          toast({ message: t('appointments.rescheduled', { date: when(updated.slot.start) }) });
          onClose();
        },
        onError: (err) => {
          setError(bookingErrorKey(err));
          setPicked(null); // the grid refreshes; pick again
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('appointments.rescheduleTitle')}
      description={t('appointments.current', { date: when(appointment.slot.start) })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirm} disabled={!picked} loading={reschedule.isPending}>
            {picked
              ? t('appointments.moveTo', { date: when(picked.start) })
              : t('appointments.confirmReschedule')}
          </Button>
        </>
      }
    >
      <SummaryRows
        rows={[
          [t('booking.doctor'), l(appointment.doctor.name)],
          [t('booking.hospital'), l(appointment.hospital.name)],
        ]}
      />
      <p className="mt-4 text-sm text-brand-muted">{t('appointments.pickNewTime')}</p>
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FBE3E4] p-3 text-sm text-[#8E1F23]"
        >
          <CircleAlert aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
          {errorText(error)} {t('appointments.keptOld')}
        </p>
      )}
      <div className="mt-4">
        <SlotPicker
          doctor={appointment.doctor}
          date={date}
          onDateChange={(next) => {
            setDate(next);
            setPicked(null);
          }}
          onPick={setPicked}
          currentSlotId={appointment.slot.slotId}
          selectedSlotId={picked?.slotId ?? null}
        />
      </div>
    </Modal>
  );
}

function AppointmentsContent() {
  const { t, n } = useLocale();
  const appointments = useAppointments();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const baseId = useId();

  const all = appointments.data ?? [];
  const now = new Date();
  const upcoming = all.filter((a) => isUpcoming(a, now));
  const past = all.filter((a) => !isUpcoming(a, now)).reverse();
  const tabs: Array<{ id: Tab; count: number }> = [
    { id: 'upcoming', count: upcoming.length },
    { id: 'past', count: past.length },
  ];

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next: Tab = tab === 'upcoming' ? 'past' : 'upcoming';
    setTab(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <>
      <PageHeader title={t('appointments.title')} subtitle={t('appointments.subtitle')} />

      <div role="tablist" aria-label={t('appointments.tabsLabel')} className="mb-4 flex gap-1">
        {tabs.map(({ id, count }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              id={`${baseId}-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKey}
              className={cn(
                'inline-flex min-h-touch items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                selected ? 'bg-brand-ink text-white' : 'bg-white text-brand-ink hover:bg-white/70',
              )}
            >
              {id === 'upcoming' ? (
                <CalendarClock aria-hidden="true" className="h-4 w-4" />
              ) : (
                <History aria-hidden="true" className="h-4 w-4" />
              )}
              {t(`appointments.${id}`)}
              {appointments.data && (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    selected ? 'bg-brand-lime text-brand-ink' : 'bg-brand-canvas',
                  )}
                >
                  {n(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`}>
        <QueryState
          query={appointments}
          skeleton={
            <SkeletonGroup className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} shape="rect" className="h-44 rounded-3xl" />
              ))}
            </SkeletonGroup>
          }
          empty={null}
        >
          {() =>
            list.length === 0 ? (
              <Card>
                {tab === 'upcoming' ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t('appointments.emptyUpcomingTitle')}
                    message={t('appointments.emptyUpcomingMessage')}
                    action={
                      <Link to="/hospitals" className={buttonClasses()}>
                        <Hospital aria-hidden="true" className="h-4 w-4" />
                        {t('appointments.findHospital')}
                      </Link>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={History}
                    title={t('appointments.emptyPastTitle')}
                    message={t('appointments.emptyPastMessage')}
                  />
                )}
              </Card>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {list.map((appointment) => (
                  <li key={appointment.appointmentId}>
                    <AppointmentCard
                      appointment={appointment}
                      onCancel={tab === 'upcoming' ? () => setCancelling(appointment) : undefined}
                      onReschedule={
                        tab === 'upcoming' ? () => setRescheduling(appointment) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </div>

      {cancelling && <CancelDialog appointment={cancelling} onClose={() => setCancelling(null)} />}
      {rescheduling && (
        <RescheduleDialog appointment={rescheduling} onClose={() => setRescheduling(null)} />
      )}
    </>
  );
}

export default function AppointmentsPage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('appointments.title')} message={t('appointments.loginMessage')}>
      <AppointmentsContent />
    </RequireLogin>
  );
}
