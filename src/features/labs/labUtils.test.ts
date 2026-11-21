import { describe, expect, it } from 'vitest';
import { labs } from '@/api/mock/seed';
import type { Lab } from '@/api/types';
import { EMPTY_LAB_FILTERS, filterLabs, isOpenNow } from './labUtils';

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m);

describe('lab filters', () => {
  it('with no filters returns every lab', () => {
    expect(filterLabs(labs, EMPTY_LAB_FILTERS)).toHaveLength(labs.length);
  });

  it('filters by district', () => {
    const result = filterLabs(labs, { ...EMPTY_LAB_FILTERS, districtId: 'sylhet' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((lab) => lab.districtId === 'sylhet')).toBe(true);
  });

  it('filters by test type', () => {
    const result = filterLabs(labs, { ...EMPTY_LAB_FILTERS, test: 'igm_igg' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(labs.length);
    expect(result.every((lab) => lab.tests.some((t) => t.code === 'igm_igg'))).toBe(true);
  });

  it('filters by home sample collection', () => {
    const result = filterLabs(labs, { ...EMPTY_LAB_FILTERS, homeCollection: true });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((lab) => lab.homeCollection)).toBe(true);
  });

  it('"open now" uses opening hours (24-hour labs are always open)', () => {
    const late = filterLabs(labs, { ...EMPTY_LAB_FILTERS, openNow: true }, at(23, 30));
    expect(late.every((lab) => lab.openingHours === null)).toBe(true);
    const noon = filterLabs(labs, { ...EMPTY_LAB_FILTERS, openNow: true }, at(12));
    expect(noon).toHaveLength(labs.length);
  });

  it('combines filters', () => {
    const result = filterLabs(labs, {
      districtId: 'dhaka',
      test: 'ns1',
      homeCollection: true,
      openNow: false,
    });
    expect(result.every((l) => l.districtId === 'dhaka' && l.homeCollection)).toBe(true);
  });
});

describe('isOpenNow', () => {
  const lab = (opens: string, closes: string): Pick<Lab, 'openingHours'> => ({
    openingHours: { opens, closes },
  });
  it('handles normal and overnight hours', () => {
    expect(isOpenNow(lab('08:00', '20:00'), at(8))).toBe(true);
    expect(isOpenNow(lab('08:00', '20:00'), at(20))).toBe(false);
    expect(isOpenNow(lab('20:00', '02:00'), at(1))).toBe(true);
    expect(isOpenNow(lab('20:00', '02:00'), at(12))).toBe(false);
    expect(isOpenNow({ openingHours: null }, at(3))).toBe(true);
  });
});
