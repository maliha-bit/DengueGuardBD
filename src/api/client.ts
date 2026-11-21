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
  Doctor,
  FeverLogEntry,
  FeverLogInput,
  HospitalSummary,
  PreventionChecklist,
  TriageAnswers,
  TriageOutcome,
  TriageResult,
  Slot,
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

  getHospitals: (): Promise<HospitalSummary[]> =>
    USE_MOCK ? mockApi.getHospitals() : http('/hospitals'),

  getHospital: (hospitalId: string): Promise<HospitalSummary | null> =>
    USE_MOCK ? mockApi.getHospital(hospitalId) : http(`/hospitals/${hospitalId}`),

  getDoctors: (hospitalId: string): Promise<Doctor[]> =>
    USE_MOCK ? mockApi.getDoctors(hospitalId) : http(`/hospitals/${hospitalId}/doctors`),

  getSlots: (doctorId: string, isoDate: string): Promise<Slot[]> =>
    USE_MOCK
      ? mockApi.getSlots(doctorId, isoDate)
      : http(`/doctors/${doctorId}/slots?date=${isoDate}`),

  getAppointments: (): Promise<Appointment[]> =>
    USE_MOCK ? mockApi.getAppointments() : http('/appointments'),

  bookAppointment: (slotId: string, patientName: string): Promise<Appointment> =>
    USE_MOCK
      ? mockApi.bookAppointment(slotId, patientName)
      : send('/appointments', 'POST', { slotId, patientName }),

  cancelAppointment: (appointmentId: string): Promise<Appointment> =>
    USE_MOCK
      ? mockApi.cancelAppointment(appointmentId)
      : send(`/appointments/${appointmentId}/cancel`, 'POST'),

  rescheduleAppointment: (appointmentId: string, slotId: string): Promise<Appointment> =>
    USE_MOCK
      ? mockApi.rescheduleAppointment(appointmentId, slotId)
      : send(`/appointments/${appointmentId}/reschedule`, 'POST', { slotId }),

  getPreventionTip: (): Promise<PreventionTip | null> =>
    USE_MOCK ? mockApi.getPreventionTip() : http('/prevention/tip-of-the-day'),

  getLastTriageResult: (): Promise<TriageResult | null> =>
    USE_MOCK ? mockApi.getLastTriageResult() : http('/me/triage/latest'),

  saveTriageResult: (outcome: TriageOutcome, answers: TriageAnswers): Promise<TriageResult> =>
    USE_MOCK
      ? mockApi.saveTriageResult(outcome, answers)
      : send('/me/triage', 'POST', { outcome, answers }),

  getFeverLog: (): Promise<FeverLogEntry[]> =>
    USE_MOCK ? mockApi.getFeverLog() : http('/me/fever-log'),

  addFeverLogEntry: (input: FeverLogInput): Promise<FeverLogEntry> =>
    USE_MOCK ? mockApi.addFeverLogEntry(input) : send('/me/fever-log', 'POST', input),

  updateFeverLogEntry: (entryId: string, input: FeverLogInput): Promise<FeverLogEntry> =>
    USE_MOCK
      ? mockApi.updateFeverLogEntry(entryId, input)
      : send(`/me/fever-log/${entryId}`, 'PUT', input),

  deleteFeverLogEntry: (entryId: string): Promise<{ entryId: string }> =>
    USE_MOCK ? mockApi.deleteFeverLogEntry(entryId) : send(`/me/fever-log/${entryId}`, 'DELETE'),

  getChecklist: (): Promise<PreventionChecklist> =>
    USE_MOCK ? mockApi.getChecklist() : http('/me/prevention-checklist'),

  saveChecklist: (checked: string[]): Promise<PreventionChecklist> =>
    USE_MOCK
      ? mockApi.saveChecklist(checked)
      : send('/me/prevention-checklist', 'PUT', { checked }),
};
