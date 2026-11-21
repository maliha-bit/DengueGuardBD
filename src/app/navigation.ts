import {
  CalendarCheck,
  Droplet,
  FlaskConical,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Map,
  MapPinPlus,
  MessageCircle,
  Stethoscope,
  Thermometer,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type NavKey =
  | 'dashboard'
  | 'riskMap'
  | 'hospitals'
  | 'appointments'
  | 'symptomChecker'
  | 'homeCare'
  | 'feverLog'
  | 'chatbot'
  | 'donors'
  | 'labs'
  | 'reportSite'
  | 'profile';

export type NavBadge = 'alerts' | 'appointments';

export interface NavItem {
  key: NavKey;
  to: string;
  icon: LucideIcon;
  badge?: NavBadge;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard, badge: 'alerts' },
  { key: 'riskMap', to: '/risk', icon: Map },
  { key: 'hospitals', to: '/hospitals', icon: Hospital },
  { key: 'appointments', to: '/appointments', icon: CalendarCheck, badge: 'appointments' },
  { key: 'symptomChecker', to: '/symptoms', icon: Stethoscope },
  { key: 'homeCare', to: '/home-care', icon: HeartPulse },
  { key: 'feverLog', to: '/fever-log', icon: Thermometer },
  { key: 'chatbot', to: '/chatbot', icon: MessageCircle },
  { key: 'donors', to: '/donors', icon: Droplet },
  { key: 'labs', to: '/labs', icon: FlaskConical },
  { key: 'reportSite', to: '/report', icon: MapPinPlus },
  { key: 'profile', to: '/profile', icon: UserRound },
];

const TAB_KEYS: NavKey[] = ['dashboard', 'riskMap', 'hospitals', 'chatbot'];

/** Mobile bottom tabs (the 5th tab, "More", opens a sheet with the rest). */
export const TAB_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => TAB_KEYS.includes(item.key));

export const MORE_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => !TAB_ITEMS.includes(item));
