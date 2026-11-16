import { CalendarCheck, CheckCircle2, CircleAlert, XCircle, type LucideIcon } from 'lucide-react';
import type { AppointmentStatus } from '@/api/types';
import { Badge, type BadgeTone } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

const STATUS: Record<AppointmentStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  booked: { tone: 'lavender', icon: CalendarCheck },
  completed: { tone: 'lime', icon: CheckCircle2 },
  cancelled: { tone: 'neutral', icon: XCircle },
  missed: { tone: 'risk-medium', icon: CircleAlert },
};

/** Appointment status as icon + text. */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useLocale();
  const { tone, icon } = STATUS[status];
  return (
    <Badge tone={tone} icon={icon} size="md">
      {t(`appointments.status.${status}`)}
    </Badge>
  );
}
