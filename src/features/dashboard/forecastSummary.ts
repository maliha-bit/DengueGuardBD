import type { Division, Forecast, ForecastRun, RiskLevel } from '@/api/types';
import { forecastTrend } from '@/features/risk/riskUtils';

export interface TodaySummary {
  total: number;
  counts: Record<RiskLevel, number>;
  rising: number;
  falling: number;
}

/** Division counts by today's risk level, and how many rise/fall over the 7 days. */
export function summarizeToday(run: ForecastRun): TodaySummary {
  const first = run.days[0];
  const last = run.days[run.days.length - 1];
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  const byDivision = new Map<string, { first?: number; last?: number }>();

  for (const forecast of run.forecasts) {
    const entry = byDivision.get(forecast.divisionId) ?? {};
    if (forecast.targetDate === first) {
      counts[forecast.riskLevel] += 1;
      entry.first = forecast.predictedCases;
    }
    if (forecast.targetDate === last) entry.last = forecast.predictedCases;
    byDivision.set(forecast.divisionId, entry);
  }

  let rising = 0;
  let falling = 0;
  for (const { first: a, last: b } of byDivision.values()) {
    if (a === undefined || b === undefined) continue;
    const trend = forecastTrend(a, b);
    if (trend === 'rising') rising += 1;
    else if (trend === 'falling') falling += 1;
  }
  return { total: byDivision.size, counts, rising, falling };
}

export interface OutlookRow {
  division: Division;
  cells: Array<Forecast | undefined>;
}

/** Division × day matrix, in the order of `divisions`. */
export function outlookMatrix(run: ForecastRun, divisions: Division[]): OutlookRow[] {
  const index = new Map(run.forecasts.map((f) => [`${f.divisionId}|${f.targetDate}`, f]));
  return divisions.map((division) => ({
    division,
    cells: run.days.map((day) => index.get(`${division.divisionId}|${day}`)),
  }));
}
