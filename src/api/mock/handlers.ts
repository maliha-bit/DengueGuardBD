/**
 * Mock implementations of the planned REST endpoints. All data is SIMULATED.
 *
 * Dev helpers: add `?mock=empty` or `?mock=error` to the URL to see every card's
 * empty or error state.
 */
import type {
  Appointment,
  BedSummary,
  CaseTrend,
  Division,
  DivisionDrivers,
  DivisionId,
  Forecast,
  ForecastDriver,
  ForecastRun,
  Notification,
  PreventionTip,
  RiskLevel,
  TrendPeriod,
  User,
} from '../types';
import {
  bedAvailability,
  currentUser,
  divisions,
  forecastProfile,
  hospitals,
  nextAppointment,
  notifications,
  preventionTips,
  riskThresholds,
  seededRandom,
} from './seed';

let delayMs = 400;

/** Tests call this between cases so in-memory changes do not leak. */
export function resetMockState() {
  currentUser.alertDivisions = [];
}

/** Tests set this to 0. */
export function setMockDelay(ms: number) {
  delayMs = ms;
}

type Scenario = 'normal' | 'empty' | 'error' | 'stale';

function scenario(): Scenario {
  if (typeof window === 'undefined') return 'normal';
  const value = new URLSearchParams(window.location.search).get('mock');
  return value === 'empty' || value === 'error' || value === 'stale' ? value : 'normal';
}

export class MockApiError extends Error {}

async function respond<T>(build: () => T, empty: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const mode = scenario();
  if (mode === 'error') throw new MockApiError('Simulated network error');
  if (mode === 'empty') return empty;
  return build();
}

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function riskFor(cases: number): RiskLevel {
  if (cases >= riskThresholds.high) return 'high';
  if (cases >= riskThresholds.medium) return 'medium';
  return 'low';
}

function predictedCases(divisionId: DivisionId, dayIndex: number) {
  const { base, slope } = forecastProfile[divisionId];
  const rand = seededRandom(divisionId.length * 97 + dayIndex * 13);
  const noise = Math.round((rand() - 0.5) * base * 0.06);
  return Math.max(0, Math.round(base + slope * dayIndex + noise));
}

function buildForecastRun(now: Date): ForecastRun {
  const generatedAt = new Date(now);
  generatedAt.setHours(6, 0, 0, 0);
  // Never in the future (before 06:00 the latest run is yesterday's).
  if (generatedAt > now) generatedAt.setDate(generatedAt.getDate() - 1);
  // ?mock=stale: pretend the last model run was two days ago.
  if (scenario() === 'stale') generatedAt.setDate(generatedAt.getDate() - 2);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
  const forecasts: Forecast[] = divisions.flatMap(({ divisionId }) =>
    days.map((targetDate, i) => {
      const cases = predictedCases(divisionId, i);
      return {
        forecastId: `f-${divisionId}-${targetDate}`,
        divisionId,
        targetDate,
        predictedCases: cases,
        riskLevel: riskFor(cases),
        generatedAt: generatedAt.toISOString(),
      };
    }),
  );
  return { generatedAt: generatedAt.toISOString(), days, forecasts };
}

function buildCaseTrend(divisionId: DivisionId, period: TrendPeriod, now: Date): CaseTrend {
  if (period === 'weekly') {
    return {
      divisionId,
      period,
      points: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return { date: isoDate(d), cases: predictedCases(divisionId, i), isForecast: true };
      }),
    };
  }
  // Monthly: 5 past months of (simulated) reported cases + this month's forecast.
  const { base } = forecastProfile[divisionId];
  const shape = [0.35, 0.55, 0.8, 1.1, 1.35, 1.5];
  return {
    divisionId,
    period,
    points: shape.map((factor, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (shape.length - 1 - i), 1);
      return {
        date: isoDate(d),
        cases: Math.round(base * 30 * factor),
        isForecast: i === shape.length - 1,
      };
    }),
  };
}

function buildDrivers(divisionId: DivisionId, now: Date): DivisionDrivers {
  const { base, slope } = forecastProfile[divisionId];
  const rand = seededRandom(divisionId.length * 31 + base);
  const rising = slope > 0;
  const weight = (strength: number): ForecastDriver['weight'] =>
    strength > 0.66 ? 'strong' : strength > 0.33 ? 'moderate' : 'weak';
  const drivers: ForecastDriver[] = [
    {
      factor: 'rainfall',
      value: Math.round(rising ? 60 + rand() * 90 : 10 + rand() * 30),
      unit: 'mm',
      direction: rising ? 'raises' : 'lowers',
      weight: weight(Math.min(1, Math.abs(slope) / 8)),
    },
    {
      factor: 'humidity',
      value: Math.round(rising ? 80 + rand() * 12 : 62 + rand() * 10),
      unit: 'percent',
      direction: rising ? 'raises' : 'lowers',
      weight: weight(0.4 + rand() * 0.4),
    },
    {
      factor: 'temperature',
      value: Math.round((26 + rand() * 6) * 10) / 10,
      unit: 'celsius',
      direction: 'raises',
      weight: weight(0.2 + rand() * 0.5),
    },
    {
      factor: 'sunshine',
      value: Math.round((rising ? 3 + rand() * 2 : 6 + rand() * 2) * 10) / 10,
      unit: 'hours',
      direction: rising ? 'raises' : 'lowers',
      weight: weight(rand() * 0.5),
    },
  ];
  const rank = { strong: 0, moderate: 1, weak: 2 } as const;
  drivers.sort((a, b) => rank[a.weight] - rank[b.weight]);
  const observedAt = new Date(now);
  observedAt.setHours(5, 0, 0, 0);
  return { divisionId, drivers, observedAt: observedAt.toISOString() };
}

export const mockApi = {
  getDivisions: () => respond<Division[]>(() => divisions, []),

  getCurrentUser: () => respond<User>(() => ({ ...currentUser }), currentUser),

  getLatestForecast: () =>
    respond<ForecastRun>(() => buildForecastRun(new Date()), {
      generatedAt: new Date().toISOString(),
      days: [],
      forecasts: [],
    }),

  getBedSummary: (divisionId: DivisionId) =>
    respond<BedSummary | null>(() => {
      const ids = new Set(
        hospitals.filter((h) => h.divisionId === divisionId).map((h) => h.hospitalId),
      );
      const beds = bedAvailability(new Date()).filter((b) => ids.has(b.hospitalId));
      if (beds.length === 0) return null;
      return {
        divisionId,
        hospitalCount: beds.length,
        generalAvailable: beds.reduce((sum, b) => sum + b.generalAvailable, 0),
        icuAvailable: beds.reduce((sum, b) => sum + b.icuAvailable, 0),
        updatedAt: beds.map((b) => b.updatedAt).sort()[0] ?? new Date().toISOString(),
      };
    }, null),

  getNextAppointment: () => respond<Appointment | null>(() => nextAppointment(new Date()), null),

  getNotifications: () => respond<Notification[]>(() => notifications(new Date()), []),

  getCaseTrend: (divisionId: DivisionId, period: TrendPeriod) =>
    respond<CaseTrend>(() => buildCaseTrend(divisionId, period, new Date()), {
      divisionId,
      period,
      points: [],
    }),

  getDivisionDrivers: (divisionId: DivisionId) =>
    respond<DivisionDrivers>(() => buildDrivers(divisionId, new Date()), {
      divisionId,
      drivers: [],
      observedAt: new Date().toISOString(),
    }),

  /** Saves (in memory) whether the user gets alerts for a division. */
  setAlertSubscription: (divisionId: DivisionId, enabled: boolean) =>
    respond<User>(() => {
      const others = currentUser.alertDivisions.filter((id) => id !== divisionId);
      currentUser.alertDivisions = enabled ? [...others, divisionId] : others;
      return { ...currentUser };
    }, currentUser),

  getPreventionTip: () =>
    respond<PreventionTip | null>(() => {
      const start = new Date(new Date().getFullYear(), 0, 0).getTime();
      const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
      return preventionTips[dayOfYear % preventionTips.length] ?? null;
    }, null),
};
