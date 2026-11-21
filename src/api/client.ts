/**
 * Typed API client. With VITE_USE_MOCK=true every call goes to src/api/mock (simulated data);
 * otherwise it calls the FastAPI backend at VITE_API_URL (default "/api").
 */
import { mockApi } from './mock/handlers';
import type { DemoAccountId } from './mock/staffStore';
import type {
  Appointment,
  BreedingReport,
  BreedingReportInput,
  DonorListing,
  DonorProfile,
  DonorProfileInput,
  DonorRequest,
  DonorRequestInput,
  MisuseReason,
  BedSummary,
  CaseTrend,
  Division,
  DivisionDrivers,
  DivisionId,
  ChatContext,
  ChatFeedback,
  ChatMessage,
  ChatReply,
  Doctor,
  FeverLogEntry,
  FeverLogInput,
  HospitalSummary,
  Lab,
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

export async function http<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
  if (!response.ok) throw new ApiError(response.statusText, response.status);
  return (await response.json()) as T;
}

export async function send<T>(
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

  /** Development only: switch the mock logged-in role. The real backend has no such endpoint. */
  setDemoRole: (role: DemoAccountId): Promise<User> =>
    USE_MOCK ? mockApi.setDemoRole(role) : Promise.reject(new ApiError('Demo only', 400)),

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

  getLabs: (): Promise<Lab[]> => (USE_MOCK ? mockApi.getLabs() : http('/labs')),

  sendChatMessage: (text: string, ctx: ChatContext): Promise<ChatReply> =>
    USE_MOCK ? mockApi.sendChatMessage(text, ctx) : send('/chat', 'POST', { text, ...ctx }),

  getChatHistory: (): Promise<ChatMessage[]> =>
    USE_MOCK ? mockApi.getChatHistory() : http('/me/chat'),

  saveChatHistory: (messages: ChatMessage[]): Promise<{ count: number }> =>
    USE_MOCK ? mockApi.saveChatHistory(messages) : send('/me/chat', 'PUT', { messages }),

  clearChatHistory: (): Promise<{ count: number }> =>
    USE_MOCK ? mockApi.clearChatHistory() : send('/me/chat', 'DELETE'),

  sendChatFeedback: (
    messageId: string,
    feedback: ChatFeedback | null,
  ): Promise<{ messageId: string }> =>
    USE_MOCK
      ? mockApi.sendChatFeedback(messageId, feedback)
      : send(`/chat/messages/${messageId}/feedback`, 'PUT', { feedback }),

  getDonors: (): Promise<DonorListing[]> => (USE_MOCK ? mockApi.getDonors() : http('/donors')),

  getMyDonorProfile: (): Promise<DonorProfile | null> =>
    USE_MOCK ? mockApi.getMyDonorProfile() : http('/me/donor-profile'),

  saveDonorProfile: (input: DonorProfileInput): Promise<DonorProfile> =>
    USE_MOCK ? mockApi.saveDonorProfile(input) : send('/me/donor-profile', 'PUT', input),

  setDonorAvailability: (available: boolean): Promise<DonorProfile> =>
    USE_MOCK
      ? mockApi.setDonorAvailability(available)
      : send('/me/donor-profile/availability', 'PUT', { available }),

  getMyDonorRequests: (): Promise<DonorRequest[]> =>
    USE_MOCK ? mockApi.getMyDonorRequests() : http('/me/donor-requests'),

  createDonorRequest: (input: DonorRequestInput): Promise<DonorRequest> =>
    USE_MOCK ? mockApi.createDonorRequest(input) : send('/donor-requests', 'POST', input),

  markDonorRequestFulfilled: (requestId: string): Promise<DonorRequest> =>
    USE_MOCK
      ? mockApi.markDonorRequestFulfilled(requestId)
      : send(`/donor-requests/${requestId}/fulfilled`, 'POST'),

  getDonorInbox: (): Promise<DonorRequest[]> =>
    USE_MOCK ? mockApi.getDonorInbox() : http('/me/donor-inbox'),

  respondToDonorRequest: (requestId: string, accept: boolean): Promise<DonorRequest> =>
    USE_MOCK
      ? mockApi.respondToDonorRequest(requestId, accept)
      : send(`/donor-requests/${requestId}/${accept ? 'accept' : 'decline'}`, 'POST'),

  reportDonorMisuse: (
    requestId: string,
    reason: MisuseReason,
    note: string,
  ): Promise<{ requestId: string }> =>
    USE_MOCK
      ? mockApi.reportDonorMisuse(requestId, reason, note)
      : send(`/donor-requests/${requestId}/misuse`, 'POST', { reason, note }),

  getMyBreedingReports: (): Promise<BreedingReport[]> =>
    USE_MOCK ? mockApi.getMyBreedingReports() : http('/me/breeding-reports'),

  createBreedingReport: (input: BreedingReportInput): Promise<BreedingReport> =>
    USE_MOCK ? mockApi.createBreedingReport(input) : send('/breeding-reports', 'POST', input),

  getChecklist: (): Promise<PreventionChecklist> =>
    USE_MOCK ? mockApi.getChecklist() : http('/me/prevention-checklist'),

  saveChecklist: (checked: string[]): Promise<PreventionChecklist> =>
    USE_MOCK
      ? mockApi.saveChecklist(checked)
      : send('/me/prevention-checklist', 'PUT', { checked }),
};
