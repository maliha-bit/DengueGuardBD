import { describe, expect, it } from 'vitest';
import type { Division, Forecast, ForecastRun, RiskLevel } from '@/api/types';
import {
  buildDivisionRisks,
  FORECAST_STALE_AFTER_MS,
  forecastTrend,
  isForecastStale,
  sortByRisk,
} from './riskUtils';

describe('isForecastStale (older than 1 day)', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('is fresh for a run from this morning', () => {
    expect(isForecastStale(ago(6 * 3600_000), now)).toBe(false);
  });
  it('is fresh at exactly 24 hours', () => {
    expect(isForecastStale(ago(FORECAST_STALE_AFTER_MS), now)).toBe(false);
  });
  it('is out of date just after 24 hours', () => {
    expect(isForecastStale(ago(FORECAST_STALE_AFTER_MS + 1000), now)).toBe(true);
  });
  it('is out of date after two days', () => {
    expect(isForecastStale(ago(2 * FORECAST_STALE_AFTER_MS), now)).toBe(true);
  });
});

describe('forecastTrend', () => {
  it.each([
    [100, 120, 'rising'],
    [100, 80, 'falling'],
    [100, 104, 'stable'],
    [100, 96, 'stable'],
    [0, 5, 'rising'],
    [0, 0, 'stable'],
  ] as const)('%i → %i is %s', (first, last, trend) => {
    expect(forecastTrend(first, last)).toBe(trend);
  });
});

const division = (divisionId: Division['divisionId'], en: string): Division => ({
  divisionId,
  name: { en, bn: en },
  center: [23, 90],
});

const forecast = (
  divisionId: Division['divisionId'],
  day: number,
  cases: number,
  riskLevel: RiskLevel,
): Forecast => ({
  forecastId: `${divisionId}-${day}`,
  divisionId,
  targetDate: `2026-11-${String(16 + day).padStart(2, '0')}`,
  predictedCases: cases,
  riskLevel,
  generatedAt: '2026-11-16T06:00:00Z',
});

describe('sortByRisk (list order)', () => {
  const divisions = [
    division('rangpur', 'Rangpur'),
    division('sylhet', 'Sylhet'),
    division('dhaka', 'Dhaka'),
    division('khulna', 'Khulna'),
    division('barishal', 'Barishal'),
  ];
  const run: ForecastRun = {
    generatedAt: '2026-11-16T06:00:00Z',
    days: ['2026-11-16', '2026-11-17'],
    forecasts: [
      forecast('rangpur', 0, 20, 'low'),
      forecast('rangpur', 1, 20, 'low'),
      forecast('sylhet', 0, 60, 'medium'),
      forecast('sylhet', 1, 70, 'medium'),
      forecast('dhaka', 0, 200, 'high'),
      forecast('dhaka', 1, 210, 'high'),
      forecast('khulna', 0, 120, 'high'),
      forecast('khulna', 1, 100, 'high'),
      forecast('barishal', 0, 60, 'medium'),
      forecast('barishal', 1, 50, 'medium'),
    ],
  };

  it('puts high first, then medium, then low; more cases first; then by name', () => {
    const sorted = sortByRisk(buildDivisionRisks(run, divisions)).map(
      (item) => item.division.name.en,
    );
    expect(sorted).toEqual(['Dhaka', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur']);
  });

  it('does not mutate the input', () => {
    const items = buildDivisionRisks(run, divisions);
    const before = items.map((item) => item.division.divisionId);
    sortByRisk(items);
    expect(items.map((item) => item.division.divisionId)).toEqual(before);
  });

  it('builds 7-day rows with today first and a trend', () => {
    const [rangpur, sylhet] = buildDivisionRisks(run, divisions);
    expect(rangpur?.today.targetDate).toBe('2026-11-16');
    expect(rangpur?.trend).toBe('stable');
    expect(sylhet?.trend).toBe('rising');
  });
});
