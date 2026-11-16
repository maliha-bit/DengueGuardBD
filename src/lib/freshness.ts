/** Bed figures older than this are "possibly out of date" (NFR14; configurable later). */
export const BED_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export function isBedDataStale(updatedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(updatedAt).getTime() > BED_STALE_AFTER_MS;
}
