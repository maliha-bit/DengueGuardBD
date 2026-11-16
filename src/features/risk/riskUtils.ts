import type { Division, DivisionId, Forecast, ForecastRun } from '@/api/types';
import { RISK_META } from '@/lib/risk';

export type Trend = 'rising' | 'falling' | 'stable';

/** A forecast older than this is shown as "Out of date". */
export const FORECAST_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Change of more than ±5% between day 1 and day 7 counts as rising/falling. */
const TREND_THRESHOLD = 0.05;

export function forecastTrend(first: number, last: number): Trend {
  if (first <= 0) return last > 0 ? 'rising' : 'stable';
  const change = (last - first) / first;
  if (change > TREND_THRESHOLD) return 'rising';
  if (change < -TREND_THRESHOLD) return 'falling';
  return 'stable';
}

export function isForecastStale(generatedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(generatedAt).getTime() > FORECAST_STALE_AFTER_MS;
}

export interface DivisionRisk {
  division: Division;
  /** Today's forecast (day 1). */
  today: Forecast;
  /** All 7 days in order. */
  days: Forecast[];
  trend: Trend;
}

/** Join divisions with their 7-day forecasts. Divisions without data are skipped. */
export function buildDivisionRisks(run: ForecastRun, divisions: Division[]): DivisionRisk[] {
  const byDivision = new Map<DivisionId, Forecast[]>();
  for (const forecast of run.forecasts) {
    const list = byDivision.get(forecast.divisionId) ?? [];
    list.push(forecast);
    byDivision.set(forecast.divisionId, list);
  }
  return divisions.flatMap((division) => {
    const days = (byDivision.get(division.divisionId) ?? []).sort((a, b) =>
      a.targetDate.localeCompare(b.targetDate),
    );
    const today = days[0];
    const last = days[days.length - 1];
    if (!today || !last) return [];
    return [
      {
        division,
        today,
        days,
        trend: forecastTrend(today.predictedCases, last.predictedCases),
      },
    ];
  });
}

/** Highest risk first; within a level, more forecast cases first; then by name. */
export function sortByRisk(items: DivisionRisk[]): DivisionRisk[] {
  return [...items].sort(
    (a, b) =>
      RISK_META[a.today.riskLevel].rank - RISK_META[b.today.riskLevel].rank ||
      b.today.predictedCases - a.today.predictedCases ||
      a.division.name.en.localeCompare(b.division.name.en),
  );
}
