import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, reportTimeline, validatePhoto } from './reportUtils';

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe('photo validation', () => {
  it('accepts JPG and PNG up to 5 MB', () => {
    expect(validatePhoto(file('site.jpg', 'image/jpeg', 1024))).toBeNull();
    expect(validatePhoto(file('site.JPEG', 'image/jpeg', MAX_PHOTO_BYTES))).toBeNull();
    expect(validatePhoto(file('site.png', 'image/png', 2_000_000))).toBeNull();
  });

  it('rejects other file types', () => {
    expect(validatePhoto(file('site.gif', 'image/gif', 1024))).toBe('type');
    expect(validatePhoto(file('site.webp', 'image/webp', 1024))).toBe('type');
    expect(validatePhoto(file('notes.pdf', 'application/pdf', 1024))).toBe('type');
    // Type and extension must both match.
    expect(validatePhoto(file('site.exe', 'image/png', 1024))).toBe('type');
  });

  it('rejects photos over 5 MB', () => {
    expect(validatePhoto(file('big.png', 'image/png', MAX_PHOTO_BYTES + 1))).toBe('size');
  });
});

describe('report timeline', () => {
  const labels = {
    submitted: 'Submitted',
    under_review: 'Under review',
    action_taken: 'Action taken',
    rejected: 'Rejected',
    outcome: 'Outcome',
  };
  const times = { createdAt: 'a', updatedAt: 'b' };

  it('shows each stage', () => {
    expect(reportTimeline('submitted', labels, times).map((s) => s.state)).toEqual([
      'done',
      'upcoming',
      'upcoming',
    ]);
    expect(reportTimeline('under_review', labels, times).map((s) => s.state)).toEqual([
      'done',
      'current',
      'upcoming',
    ]);
    const done = reportTimeline('action_taken', labels, times);
    expect(done.map((s) => s.state)).toEqual(['done', 'done', 'done']);
    expect(done[2]?.label).toBe('Action taken');
    const rejected = reportTimeline('rejected', labels, times);
    expect(rejected[2]).toMatchObject({ label: 'Rejected', state: 'failed' });
  });
});
