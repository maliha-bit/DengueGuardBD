import { describe, expect, it } from 'vitest';
import type { ForecastRun, RiskLevel } from '@/api/types';
import { outlookMatrix, summarizeToday } from './forecastSummary';

const days = ['2026-11-16', '2026-11-22'];

function forecast(
  divisionId: 'dhaka' | 'sylhet' | 'khulna',
  i: number,
  cases: number,
  risk: RiskLevel,
) {
  return {
    forecastId: `${divisionId}-${i}`,
    divisionId,
    targetDate: days[i]!,
    predictedCases: cases,
    riskLevel: risk,
    generatedAt: '2026-11-16T06:00:00Z',
  };
}

const run: ForecastRun = {
  generatedAt: '2026-11-16T06:00:00Z',
  days,
  forecasts: [
    forecast('dhaka', 0, 150, 'high'),
    forecast('dhaka', 1, 180, 'high'),
    forecast('sylhet', 0, 50, 'medium'),
    forecast('sylhet', 1, 30, 'low'),
    forecast('khulna', 0, 20, 'low'),
    forecast('khulna', 1, 20, 'low'),
  ],
};

describe('summarizeToday', () => {
  it('counts divisions by today’s risk and the 7-day direction', () => {
    expect(summarizeToday(run)).toEqual({
      total: 3,
      counts: { high: 1, medium: 1, low: 1 },
      rising: 1,
      falling: 1,
    });
  });
});

describe('outlookMatrix', () => {
  it('builds one row per division with a cell per day', () => {
    const rows = outlookMatrix(run, [
      { divisionId: 'sylhet', name: { en: 'Sylhet', bn: 'সিলেট' } },
      { divisionId: 'rangpur', name: { en: 'Rangpur', bn: 'রংপুর' } },
    ]);
    expect(rows[0]?.cells.map((c) => c?.riskLevel)).toEqual(['medium', 'low']);
    expect(rows[1]?.cells).toEqual([undefined, undefined]);
  });
});
