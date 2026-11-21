/**
 * Home-care guide content (UC15). Text lives in the locale files under `homeCare.sections`;
 * this file only lists which items each section shows and when it was last reviewed.
 */
import { Ban, Droplets, HeartHandshake, Pill, Siren, type LucideIcon } from 'lucide-react';

export type HomeCareSectionKey = 'hydration' | 'fever' | 'avoid' | 'warning' | 'recovery';

export interface HomeCareSection {
  key: HomeCareSectionKey;
  icon: LucideIcon;
  tone: 'light' | 'danger' | 'lime';
  items: readonly string[];
  /** yyyy-mm-dd: date the section was last checked against DGHS / WHO guidance. */
  reviewedOn: string;
}

export const HOME_CARE_SECTIONS = [
  {
    key: 'hydration',
    icon: Droplets,
    tone: 'lime',
    items: ['ors', 'water', 'coconut', 'soup', 'juice'],
    reviewedOn: '2026-10-15',
  },
  {
    key: 'fever',
    icon: Pill,
    tone: 'light',
    items: ['paracetamol', 'dose', 'sponge', 'rest'],
    reviewedOn: '2026-10-15',
  },
  {
    key: 'avoid',
    icon: Ban,
    tone: 'danger',
    items: ['ibuprofen', 'aspirin', 'otherNsaids', 'injections'],
    reviewedOn: '2026-10-15',
  },
  {
    key: 'warning',
    icon: Siren,
    tone: 'light',
    items: ['bellyPain', 'vomiting', 'bleeding', 'drowsiness', 'coldSkin', 'lowUrine'],
    reviewedOn: '2026-10-15',
  },
  {
    key: 'recovery',
    icon: HeartHandshake,
    tone: 'light',
    items: ['noFever', 'appetite', 'urine', 'energy'],
    reviewedOn: '2026-10-15',
  },
] as const satisfies readonly HomeCareSection[];

/** Prevention checklist item ids (text in `homeCare.checklist.items`). */
export const CHECKLIST_ITEMS = [
  'standingWater',
  'coverContainers',
  'scrubContainers',
  'clearDrains',
  'nets',
  'repellent',
  'sleeves',
  'screens',
] as const;

export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];
