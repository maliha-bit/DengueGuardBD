import type { Lab, LabTest, LabTestCode } from '@/api/types';

export const LAB_TESTS: LabTestCode[] = ['ns1', 'igm_igg', 'cbc'];

export interface LabFilters {
  districtId: string;
  test: LabTestCode | '';
  homeCollection: boolean;
  openNow: boolean;
}

export const EMPTY_LAB_FILTERS: LabFilters = {
  districtId: '',
  test: '',
  homeCollection: false,
  openNow: false,
};

const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Open right now? Labs with no hours listed are open 24 hours. */
export function isOpenNow(lab: Pick<Lab, 'openingHours'>, now: Date = new Date()): boolean {
  if (!lab.openingHours) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const opens = minutesOf(lab.openingHours.opens);
  const closes = minutesOf(lab.openingHours.closes);
  // Hours past midnight (e.g. 20:00–02:00).
  return opens <= closes
    ? current >= opens && current < closes
    : current >= opens || current < closes;
}

export function matchesLab(lab: Lab, f: LabFilters, now: Date = new Date()): boolean {
  if (f.districtId && lab.districtId !== f.districtId) return false;
  if (f.test && !lab.tests.some((t) => t.code === f.test)) return false;
  if (f.homeCollection && !lab.homeCollection) return false;
  if (f.openNow && !isOpenNow(lab, now)) return false;
  return true;
}

export const filterLabs = (labs: Lab[], f: LabFilters, now: Date = new Date()) =>
  labs.filter((lab) => matchesLab(lab, f, now));

/** Price as one number or a range, e.g. [300, 500]. */
export const priceRange = (test: LabTest): [number, number] => [test.priceBdt, test.priceMaxBdt];
