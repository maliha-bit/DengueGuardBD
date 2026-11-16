import { useNextAppointment, useNotifications } from '@/api/queries';
import type { NavBadge } from '@/app/navigation';

/** Counts shown in lime nav badges. 0 = no badge. */
export function useNavBadges(): Record<NavBadge, number> {
  const notifications = useNotifications();
  const appointment = useNextAppointment();
  return {
    alerts: notifications.data?.filter((n) => !n.read).length ?? 0,
    appointments: appointment.data ? 1 : 0,
  };
}
