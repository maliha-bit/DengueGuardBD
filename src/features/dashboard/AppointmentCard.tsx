import { CalendarClock, CalendarDays, CalendarPlus, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNextAppointment } from '@/api/queries';
import { Avatar } from '@/components/Avatar';
import { QueryState } from '@/components/QueryState';
import { buttonClasses, Card, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { CardLink } from './CardLink';

export function AppointmentCard({ className }: { className?: string }) {
  const { t, l, n, d, lang } = useLocale();
  const query = useNextAppointment();

  return (
    <Card
      title={t('dashboard.appointment.title')}
      icon={CalendarClock}
      actions={<CardLink to="/appointments" label={t('dashboard.appointment.open')} />}
      className={cn('flex flex-col', className)}
    >
      <QueryState
        query={query}
        compact
        skeleton={
          <SkeletonGroup className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" className="h-11 w-11" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton shape="text" className="w-2/3" />
                <Skeleton shape="text" className="w-1/2" />
              </div>
            </div>
            <Skeleton shape="text" className="h-8 w-3/4 rounded-full" />
          </SkeletonGroup>
        }
        empty={
          <EmptyState
            compact
            icon={CalendarPlus}
            title={t('dashboard.appointment.emptyTitle')}
            message={t('dashboard.appointment.emptyMessage')}
            action={
              <Link to="/appointments" className={buttonClasses({ size: 'sm' })}>
                <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                {t('dashboard.appointment.book')}
              </Link>
            }
          />
        }
      >
        {(appointment) => (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3">
              <Avatar name={appointment.doctor.name.en} tone="lime" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l(appointment.doctor.name)}</p>
                <p className="truncate text-xs text-brand-muted">
                  {l(appointment.doctor.specialty)} · {l(appointment.hospital.name)}
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs font-medium">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand-canvas px-3">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                {d(appointment.slot.start, { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {formatTime(appointment.slot.start, lang)}
              </span>
              <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-lime px-3">
                <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                {t('dashboard.appointment.serial', {
                  serial: n(appointment.serialNo, { minimumIntegerDigits: 2 }),
                })}
              </span>
            </div>
          </div>
        )}
      </QueryState>
    </Card>
  );
}
