import { describe, expect, it } from 'vitest';
import type { District, HospitalSummary } from '@/api/types';
import {
  districtHasNoBeds,
  matchesFilters,
  nearbyWithBeds,
  sortHospitals,
  type HospitalFilters,
} from './hospitalUtils';

const base: HospitalFilters = {
  divisionId: null,
  districtId: null,
  icuOnly: false,
  query: '',
  sort: 'beds',
};

function summary(
  id: string,
  districtId: string,
  general: number,
  icu: number,
  location: [number, number],
  updatedMinutesAgo = 10,
): HospitalSummary {
  return {
    hospital: {
      hospitalId: id,
      name: { en: `${id} Hospital`, bn: `${id} হাসপাতাল` },
      type: 'government',
      divisionId: 'dhaka',
      districtId,
      district: { en: districtId, bn: districtId },
      address: { en: 'Road', bn: 'রোড' },
      phone: '+8802000000',
      location,
      hasEmergency: true,
    },
    beds: {
      hospitalId: id,
      generalTotal: 100,
      generalAvailable: general,
      icuTotal: 10,
      icuAvailable: icu,
      updatedAt: new Date(Date.UTC(2026, 10, 17, 12, 0) - updatedMinutesAgo * 60_000).toISOString(),
    },
  };
}

const all = [
  summary('Alpha', 'dhaka', 20, 0, [23.8, 90.4], 50),
  summary('Beta', 'dhaka', 5, 3, [23.75, 90.38], 5),
  summary('Gamma', 'gazipur', 0, 0, [24.0, 90.42]),
  summary('Delta', 'narayanganj', 8, 1, [23.62, 90.5]),
];
const gazipur: District = {
  districtId: 'gazipur',
  name: { en: 'Gazipur', bn: 'গাজীপুর' },
  center: [24.0, 90.42],
};

describe('hospital filters', () => {
  it('filters by district, ICU and name (English or Bangla)', () => {
    expect(all.filter((s) => matchesFilters(s, { ...base, districtId: 'dhaka' }))).toHaveLength(2);
    expect(
      all
        .filter((s) => matchesFilters(s, { ...base, icuOnly: true }))
        .map((s) => s.hospital.hospitalId),
    ).toEqual(['Beta', 'Delta']);
    expect(all.filter((s) => matchesFilters(s, { ...base, query: 'gam' }))).toHaveLength(1);
    expect(all.filter((s) => matchesFilters(s, { ...base, query: 'ডেল' }))).toHaveLength(0);
    expect(all.filter((s) => matchesFilters(s, { ...base, query: 'Gamma হাসপাতাল' }))).toHaveLength(
      1,
    );
  });

  it('sorts by most beds, nearest and recently updated', () => {
    const ids = (list: HospitalSummary[]) => list.map((s) => s.hospital.hospitalId);
    expect(ids(sortHospitals(all, 'beds', null))).toEqual(['Alpha', 'Delta', 'Beta', 'Gamma']);
    expect(ids(sortHospitals(all, 'nearest', [24.0, 90.42]))[0]).toBe('Gamma');
    expect(ids(sortHospitals(all, 'updated', null))[0]).toBe('Beta');
  });

  it('detects a district with no free beds and suggests the nearest hospitals with beds', () => {
    const { noBeds, inDistrict } = districtHasNoBeds(all, { ...base, districtId: 'gazipur' });
    expect(noBeds).toBe(true);
    expect(inDistrict.map((s) => s.hospital.hospitalId)).toEqual(['Gamma']);
    const nearby = nearbyWithBeds(all, gazipur, false);
    expect(nearby.map((n) => n.summary.hospital.hospitalId)).toEqual(['Alpha', 'Beta', 'Delta']);
    expect(nearby[0]!.km).toBeGreaterThan(10);
    expect(districtHasNoBeds(all, { ...base, districtId: 'dhaka' }).noBeds).toBe(false);
  });
});
