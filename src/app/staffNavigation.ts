import {
  Activity,
  BedDouble,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarPlus,
  ChartColumn,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  ListTodo,
  MapPinned,
  ScrollText,
  Stethoscope,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import type { StaffRole } from '@/api/types';

export type StaffNavKey =
  | 'hospitalOverview'
  | 'beds'
  | 'doctors'
  | 'schedule'
  | 'slots'
  | 'appointments'
  | 'labListing'
  | 'authorityOverview'
  | 'reports'
  | 'tasks'
  | 'approvals'
  | 'directories'
  | 'knowledge'
  | 'forecast'
  | 'analytics'
  | 'audit';

export interface StaffNavItem {
  key: StaffNavKey;
  to: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar (the rest go in "More"). */
  tab?: boolean;
  end?: boolean;
}

/** Sidebar items per staff role (each portal has its own). */
export const STAFF_NAV: Record<StaffRole, StaffNavItem[]> = {
  hospital_staff: [
    { key: 'hospitalOverview', to: '/staff/hospital', icon: LayoutDashboard, tab: true, end: true },
    { key: 'beds', to: '/staff/hospital/beds', icon: BedDouble, tab: true },
    { key: 'doctors', to: '/staff/hospital/doctors', icon: Stethoscope, tab: true },
    { key: 'appointments', to: '/staff/hospital/appointments', icon: ClipboardList, tab: true },
    { key: 'schedule', to: '/staff/hospital/schedule', icon: CalendarClock },
    { key: 'slots', to: '/staff/hospital/slots', icon: CalendarPlus },
  ],
  lab_staff: [{ key: 'labListing', to: '/staff/lab', icon: FlaskConical, tab: true, end: true }],
  authority: [
    {
      key: 'authorityOverview',
      to: '/staff/authority',
      icon: LayoutDashboard,
      tab: true,
      end: true,
    },
    { key: 'reports', to: '/staff/authority/reports', icon: MapPinned, tab: true },
    { key: 'tasks', to: '/staff/authority/tasks', icon: ListTodo, tab: true },
  ],
  admin: [
    { key: 'approvals', to: '/staff/admin', icon: UserCheck, tab: true, end: true },
    { key: 'directories', to: '/staff/admin/directories', icon: Building2, tab: true },
    { key: 'analytics', to: '/staff/admin/analytics', icon: ChartColumn, tab: true },
    { key: 'audit', to: '/staff/admin/audit', icon: ScrollText, tab: true },
    { key: 'knowledge', to: '/staff/admin/knowledge', icon: BookOpen },
    { key: 'forecast', to: '/staff/admin/forecast', icon: Activity },
  ],
};
