import type { District, Division, DivisionId, HospitalSummary, LocalizedText } from '@/api/types';
import { distanceKm, type LatLng } from '@/lib/geo';

export type HospitalSort = 'beds' | 'nearest' | 'updated';
export const HOSPITAL_SORTS: HospitalSort[] = ['beds', 'nearest', 'updated'];

export interface HospitalFilters {
  divisionId: DivisionId | null;
  districtId: string | null;
  icuOnly: boolean;
  query: string;
  sort: HospitalSort;
}

/** Free beds that matter for the current filter (ICU only, or general + ICU). */
export const freeBeds = ({ beds }: HospitalSummary, icuOnly: boolean) =>
  icuOnly ? beds.icuAvailable : beds.generalAvailable + beds.icuAvailable;

const matchesText = (name: LocalizedText, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || name.en.toLowerCase().includes(q) || name.bn.includes(query.trim());
};

/** Division, district and name filters (not the ICU filter). */
export function matchesPlace(summary: HospitalSummary, f: HospitalFilters): boolean {
  const { hospital } = summary;
  return (
    (!f.divisionId || hospital.divisionId === f.divisionId) &&
    (!f.districtId || hospital.districtId === f.districtId) &&
    matchesText(hospital.name, f.query)
  );
}

export function matchesFilters(summary: HospitalSummary, f: HospitalFilters): boolean {
  return matchesPlace(summary, f) && (!f.icuOnly || summary.beds.icuAvailable > 0);
}

export function sortHospitals(
  list: HospitalSummary[],
  sort: HospitalSort,
  origin: LatLng | null,
  icuOnly = false,
): HospitalSummary[] {
  const byBeds = (a: HospitalSummary, b: HospitalSummary) =>
    freeBeds(b, icuOnly) - freeBeds(a, icuOnly) ||
    a.hospital.name.en.localeCompare(b.hospital.name.en);
  return [...list].sort((a, b) => {
    if (sort === 'nearest' && origin) {
      return distanceKm(origin, a.hospital.location) - distanceKm(origin, b.hospital.location);
    }
    if (sort === 'updated') return b.beds.updatedAt.localeCompare(a.beds.updatedAt) || byBeds(a, b);
    return byBeds(a, b);
  });
}

export interface PlaceRef {
  point: LatLng;
  name: LocalizedText;
}

/** Where "nearest" is measured from: the chosen district, else division, else none. */
export function referencePoint(f: HospitalFilters, divisions: Division[]): PlaceRef | null {
  const division = divisions.find((d) => d.divisionId === f.divisionId);
  const district = division?.districts.find((d) => d.districtId === f.districtId);
  if (district) return { point: district.center, name: district.name };
  if (division) return { point: division.center, name: division.name };
  return null;
}

/** True when a district is chosen, has hospitals, and none of them has a free bed. */
export function districtHasNoBeds(
  all: HospitalSummary[],
  f: HospitalFilters,
): { inDistrict: HospitalSummary[]; noBeds: boolean } {
  if (!f.districtId) return { inDistrict: [], noBeds: false };
  const inDistrict = all.filter((s) => matchesPlace(s, { ...f, query: '' }));
  return {
    inDistrict,
    noBeds: inDistrict.length > 0 && inDistrict.every((s) => freeBeds(s, f.icuOnly) === 0),
  };
}

/** Hospitals in other districts that have free beds, nearest first. */
export function nearbyWithBeds(
  all: HospitalSummary[],
  district: District,
  icuOnly: boolean,
  limit = 4,
): Array<{ summary: HospitalSummary; km: number }> {
  return all
    .filter((s) => s.hospital.districtId !== district.districtId && freeBeds(s, icuOnly) > 0)
    .map((summary) => ({ summary, km: distanceKm(district.center, summary.hospital.location) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}
