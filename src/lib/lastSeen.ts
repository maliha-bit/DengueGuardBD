/**
 * Last-seen risk data, saved on this device so the offline page can show it.
 * Only the latest forecast summary and division names are kept (no personal data).
 */
import type { Division, DivisionId, ForecastRun, LocalizedText, RiskLevel } from '@/api/types';

const KEY = 'dg.lastSeenRisk';

export interface LastSeenRisk {
  savedAt: string;
  generatedAt: string;
  divisions: Array<{ divisionId: DivisionId; riskLevel: RiskLevel; predictedCases: number }>;
  names: Partial<Record<DivisionId, LocalizedText>>;
}

function read(): Partial<LastSeenRisk> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<LastSeenRisk>) : {};
  } catch {
    return {};
  }
}

function write(value: Partial<LastSeenRisk>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // storage full or blocked: offline page simply has no saved data
  }
}

/** Save today's risk per division from a forecast run. */
export function saveLastSeenForecast(run: ForecastRun, now: Date = new Date()) {
  const today = run.days[0];
  if (!today) return;
  const divisions = run.forecasts
    .filter((f) => f.targetDate === today)
    .map((f) => ({
      divisionId: f.divisionId,
      riskLevel: f.riskLevel,
      predictedCases: f.predictedCases,
    }));
  if (divisions.length === 0) return;
  write({ ...read(), savedAt: now.toISOString(), generatedAt: run.generatedAt, divisions });
}

export function saveLastSeenDivisions(list: Division[]) {
  if (list.length === 0) return;
  write({ ...read(), names: Object.fromEntries(list.map((d) => [d.divisionId, d.name])) });
}

/** The saved summary, or null when nothing has been seen on this device yet. */
export function readLastSeenRisk(): LastSeenRisk | null {
  const value = read();
  if (!value.savedAt || !value.generatedAt || !value.divisions?.length) return null;
  return {
    savedAt: value.savedAt,
    generatedAt: value.generatedAt,
    divisions: value.divisions,
    names: value.names ?? {},
  };
}
