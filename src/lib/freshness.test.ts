import { describe, expect, it } from 'vitest';
import { buildIcs } from './calendar';
import { BED_STALE_AFTER_MS, isBedDataStale } from './freshness';

describe('isBedDataStale ("possibly out of date" after 6 hours)', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('is fresh after 20 minutes', () => {
    expect(isBedDataStale(ago(20 * 60_000), now)).toBe(false);
  });
  it('is fresh at exactly 6 hours', () => {
    expect(isBedDataStale(ago(BED_STALE_AFTER_MS), now)).toBe(false);
  });
  it('is possibly out of date just after 6 hours', () => {
    expect(isBedDataStale(ago(BED_STALE_AFTER_MS + 1000), now)).toBe(true);
  });
  it('is possibly out of date after 8 hours', () => {
    expect(isBedDataStale(ago(8 * 3600_000), now)).toBe(true);
  });
});

describe('buildIcs', () => {
  it('produces a valid single-event calendar with escaped text', () => {
    const ics = buildIcs(
      {
        uid: 'a-1',
        title: 'Doctor appointment: Dr. Test',
        start: new Date('2026-11-19T04:30:00Z'),
        durationMinutes: 30,
        location: 'Dhaka Care Hospital, 12 Hospital Road; Dhaka',
      },
      new Date('2026-11-17T00:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261119T043000Z');
    expect(ics).toContain('DTEND:20261119T050000Z');
    expect(ics).toContain('LOCATION:Dhaka Care Hospital\\, 12 Hospital Road\\; Dhaka');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
