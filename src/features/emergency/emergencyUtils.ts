import type { DivisionId, Hospital } from '@/api/types';
import { distanceKm, type LatLng } from '@/lib/geo';

export interface NearestHospital {
  hospital: Hospital;
  /** Only known when the user shared their location. */
  distanceKm: number | null;
}

/**
 * Nearest hospital with a 24-hour emergency department.
 * With the user's position: nearest overall. Without it: nearest to the centre of the
 * user's division, preferring hospitals inside that division.
 */
export function nearestEmergencyHospital(
  hospitals: Hospital[],
  options: { divisionId: DivisionId; divisionCenter: LatLng | null; position: LatLng | null },
): NearestHospital | null {
  const withEmergency = hospitals.filter((h) => h.hasEmergency);
  const { position, divisionId, divisionCenter } = options;
  if (position) {
    const best = closest(withEmergency, position);
    return best ? { hospital: best, distanceKm: distanceKm(position, best.location) } : null;
  }
  const inDivision = withEmergency.filter((h) => h.divisionId === divisionId);
  const pool = inDivision.length > 0 ? inDivision : withEmergency;
  const best = divisionCenter ? closest(pool, divisionCenter) : (pool[0] ?? null);
  return best ? { hospital: best, distanceKm: null } : null;
}

function closest(hospitals: Hospital[], point: LatLng): Hospital | null {
  let best: Hospital | null = null;
  let bestKm = Infinity;
  for (const h of hospitals) {
    const km = distanceKm(point, h.location);
    if (km < bestKm) {
      best = h;
      bestKm = km;
    }
  }
  return best;
}

/** Google Maps link to a point, for sharing with family or an ambulance. */
export const locationUrl = ([lat, lng]: LatLng) =>
  `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
