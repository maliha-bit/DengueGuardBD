/**
 * Typed API client. With VITE_USE_MOCK=true every call goes to src/api/mock (simulated data);
 * otherwise it calls the FastAPI backend at VITE_API_URL (default "/api").
 */
import { mockApi } from './mock/handlers';
import type {
  Appointment,
  BedSummary,
  CaseTrend,
  Division,
  DivisionDrivers,
  DivisionId,
  ForecastRun,
  Notification,
  PreventionTip,
  TrendPeriod,
  User,
} from './types';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function http<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
  if (!response.ok) throw new ApiError(response.statusText, response.status);
  return (await response.json()) as T;
}

async function send<T>(
  path: string,
  method: 'PUT' | 'POST' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new ApiError(response.statusText, response.status);
  return (await response.json()) as T;
}

export const api = {
  getDivisions: (): Promise<Division[]> => (USE_MOCK ? mockApi.getDivisions() : http('/divisions')),

  getCurrentUser: (): Promise<User> => (USE_MOCK ? mockApi.getCurrentUser() : http('/me')),

  getLatestForecast: (): Promise<ForecastRun> =>
    USE_MOCK ? mockApi.getLatestForecast() : http('/forecasts/latest'),

  getBedSummary: (divisionId: DivisionId): Promise<BedSummary | null> =>
    USE_MOCK ? mockApi.getBedSummary(divisionId) : http(`/divisions/${divisionId}/beds/summary`),

  getNextAppointment: (): Promise<Appointment | null> =>
    USE_MOCK ? mockApi.getNextAppointment() : http('/appointments/next'),

  getNotifications: (): Promise<Notification[]> =>
    USE_MOCK ? mockApi.getNotifications() : http('/notifications'),

  getCaseTrend: (divisionId: DivisionId, period: TrendPeriod): Promise<CaseTrend> =>
    USE_MOCK
      ? mockApi.getCaseTrend(divisionId, period)
      : http(`/divisions/${divisionId}/cases?period=${period}`),

  getDivisionDrivers: (divisionId: DivisionId): Promise<DivisionDrivers> =>
    USE_MOCK ? mockApi.getDivisionDrivers(divisionId) : http(`/divisions/${divisionId}/drivers`),

  setAlertSubscription: (divisionId: DivisionId, enabled: boolean): Promise<User> =>
    USE_MOCK
      ? mockApi.setAlertSubscription(divisionId, enabled)
      : send(`/me/alerts/${divisionId}`, enabled ? 'PUT' : 'DELETE'),

  getPreventionTip: (): Promise<PreventionTip | null> =>
    USE_MOCK ? mockApi.getPreventionTip() : http('/prevention/tip-of-the-day'),
};
