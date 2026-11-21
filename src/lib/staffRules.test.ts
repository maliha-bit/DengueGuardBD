import { describe, expect, it } from 'vitest';
import type { PreventionTask, SlotDraft, WeeklyScheduleDay } from '@/api/types';
import { bedSchema } from '@/features/hospital-portal/bedForm';
import { portalAccess } from './access';
import { clampBeds, validateBedCount } from './beds';
import { toCsv } from './csv';
import { findOverlaps, generateSlots, hasInvalidRanges, rangesOverlap } from './slots';
import { groupTasks, isOverdue, taskColumn } from './tasks';

describe('bed validation', () => {
  it('accepts whole numbers from 0 to the total', () => {
    expect(validateBedCount(0, 40)).toBeNull();
    expect(validateBedCount(40, 40)).toBeNull();
    expect(validateBedCount(12, 40)).toBeNull();
  });

  it('rejects negatives, numbers over the total and non-whole numbers', () => {
    expect(validateBedCount(-1, 40)).toBe('negative');
    expect(validateBedCount(41, 40)).toBe('overTotal');
    expect(validateBedCount(2.5, 40)).toBe('notWhole');
    expect(validateBedCount(Number.NaN, 40)).toBe('notWhole');
  });

  it('clamps stepper values into 0..total', () => {
    expect(clampBeds(-3, 10)).toBe(0);
    expect(clampBeds(14, 10)).toBe(10);
    expect(clampBeds(Number.NaN, 10)).toBe(0);
  });

  it('the form schema reports errors per field', () => {
    const schema = bedSchema({ generalTotal: 80, icuTotal: 10 });
    expect(schema.safeParse({ generalAvailable: 80, icuAvailable: 0 }).success).toBe(true);
    const result = schema.safeParse({ generalAvailable: 81, icuAvailable: -1 });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    expect(issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['generalAvailable', 'overTotal'],
      ['icuAvailable', 'negative'],
    ]);
  });
});

describe('slot overlap check', () => {
  const at = (day: number, hh: number, mm = 0) => new Date(2026, 10, day, hh, mm).toISOString();
  const slot = (start: string, end: string, doctorId = 'd1'): SlotDraft => ({
    doctorId,
    start,
    end,
    capacity: 10,
  });

  it('treats touching ends as not overlapping', () => {
    expect(rangesOverlap(0, 30, 30, 60)).toBe(false);
    expect(rangesOverlap(0, 31, 30, 60)).toBe(true);
  });

  it('finds new slots that clash with published ones of the same doctor', () => {
    const published = [slot(at(23, 9), at(23, 9, 30))];
    const drafts = [
      slot(at(23, 9, 15), at(23, 9, 30)), // overlaps the published slot
      slot(at(23, 9, 30), at(23, 10)), // touches: fine
      slot(at(23, 9), at(23, 9, 30), 'd2'), // other doctor: fine
    ];
    expect(findOverlaps(drafts, published)).toEqual([drafts[0]]);
  });

  it('finds new slots that clash with each other', () => {
    const drafts = [slot(at(24, 10), at(24, 10, 30)), slot(at(24, 10, 20), at(24, 10, 50))];
    expect(findOverlaps(drafts, [])).toHaveLength(2);
  });

  it('generates only full slots inside the schedule, on scheduled weekdays', () => {
    // 23 Nov 2026 is a Monday (1).
    const schedule: WeeklyScheduleDay[] = [{ day: 1, ranges: [{ start: '09:00', end: '10:10' }] }];
    const drafts = generateSlots(
      { doctorId: 'd1', from: '2026-11-22', to: '2026-11-24', slotMinutes: 30, capacity: 8 },
      schedule,
    );
    expect(drafts.map((d) => d.start)).toEqual([at(23, 9), at(23, 9, 30)]);
    expect(drafts.every((d) => d.capacity === 8)).toBe(true);
  });

  it('flags schedule ranges that overlap or end before they start', () => {
    expect(
      hasInvalidRanges([
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' },
      ]),
    ).toBe(false);
    expect(
      hasInvalidRanges([
        { start: '09:00', end: '12:00' },
        { start: '11:00', end: '13:00' },
      ]),
    ).toBe(true);
    expect(hasInvalidRanges([{ start: '12:00', end: '09:00' }])).toBe(true);
  });
});

describe('overdue task rule', () => {
  const task = (status: PreventionTask['status'], dueDate: string) => ({ status, dueDate });
  const today = '2026-11-21';

  it('is overdue when the due date has passed and the task is open or in progress', () => {
    expect(isOverdue(task('open', '2026-11-20'), today)).toBe(true);
    expect(isOverdue(task('in_progress', '2026-11-01'), today)).toBe(true);
  });

  it('is not overdue on the due date itself, or when completed or cancelled', () => {
    expect(isOverdue(task('open', today), today)).toBe(false);
    expect(isOverdue(task('completed', '2026-11-01'), today)).toBe(false);
    expect(isOverdue(task('cancelled', '2026-11-01'), today)).toBe(false);
  });

  it('puts overdue tasks in the Overdue column', () => {
    expect(taskColumn(task('open', '2026-11-19'), today)).toBe('overdue');
    const groups = groupTasks(
      [task('open', '2026-11-30'), task('open', '2026-11-19'), task('completed', '2026-11-19')],
      today,
    );
    expect(groups.open).toHaveLength(1);
    expect(groups.overdue).toHaveLength(1);
    expect(groups.completed).toHaveLength(1);
  });
});

describe('approval gate', () => {
  const roles = ['hospital_staff' as const];

  it('lets approved staff in', () => {
    expect(portalAccess({ role: 'hospital_staff', approvalStatus: 'approved' }, true, roles)).toBe(
      'granted',
    );
  });

  it('keeps pending, rejected and unknown-status staff out', () => {
    expect(portalAccess({ role: 'hospital_staff', approvalStatus: 'pending' }, true, roles)).toBe(
      'pending',
    );
    expect(portalAccess({ role: 'hospital_staff', approvalStatus: 'rejected' }, true, roles)).toBe(
      'rejected',
    );
    expect(portalAccess({ role: 'hospital_staff' }, true, roles)).toBe('pending');
  });

  it('checks login and role first; admins are always approved', () => {
    expect(portalAccess(undefined, true, roles)).toBe('login');
    expect(portalAccess({ role: 'hospital_staff', approvalStatus: 'approved' }, false, roles)).toBe(
      'login',
    );
    expect(portalAccess({ role: 'citizen' }, true, roles)).toBe('wrongRole');
    expect(portalAccess({ role: 'admin' }, true, ['admin'])).toBe('granted');
  });
});

describe('CSV export content', () => {
  it('writes a header row and one line per row with CRLF endings', () => {
    const csv = toCsv(
      [
        { name: 'Mirpur 10', count: 3 },
        { name: 'Agrabad', count: 0 },
      ],
      [
        { header: 'Area', value: (r) => r.name },
        { header: 'Count', value: (r) => r.count },
      ],
    );
    expect(csv).toBe('Area,Count\r\nMirpur 10,3\r\nAgrabad,0');
  });

  it('quotes commas, quotes and line breaks, keeps Bangla text, and blanks empty values', () => {
    const csv = toCsv(
      [{ a: 'Road 7, Dhanmondi', b: 'He said "stop"', c: 'line1\nline2', d: 'ঢাকা', e: null }],
      [
        { header: 'A', value: (r) => r.a },
        { header: 'B', value: (r) => r.b },
        { header: 'C', value: (r) => r.c },
        { header: 'D', value: (r) => r.d },
        { header: 'E', value: (r) => r.e },
      ],
    );
    expect(csv.split('\r\n')[1]).toBe(
      '"Road 7, Dhanmondi","He said ""stop""","line1\nline2",ঢাকা,',
    );
  });

  it('neutralises spreadsheet formulas in text cells', () => {
    const csv = toCsv([{ v: '=HYPERLINK("x")' }], [{ header: 'V', value: (r) => r.v }]);
    expect(csv.split('\r\n')[1]).toBe('"\'=HYPERLINK(""x"")"');
  });
});
