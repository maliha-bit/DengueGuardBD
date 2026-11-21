/**
 * Mock implementations of the planned REST endpoints. All data is SIMULATED.
 *
 * Dev helpers (URL query): `?mock=empty` / `?mock=error` show empty / error states,
 * `?mock=stale` makes the forecast two days old, `?mock=race` makes the next booking
 * find its slot just filled by someone else.
 */
import type {
  Appointment,
  BedSummary,
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
  doctors,
  hashString,
  hospitals,
  labs,
  notifications,
  preventionTips,
  riskThresholds,
  seededRandom,
} from './seed';
import {
  BookingStore,
  makeSlotId,
  SLOT_CAPACITY,
  toIsoDate,
  type StoredAppointment,
} from './bookingStore';
import { answerQuestion } from './chatService';
import { createHealthStore } from './healthStore';

/** Simulated demand: about 15% of sessions are already full, the rest partly booked. */
function initialBooked(slotId: string): number {
  const h = hashString(slotId);
  return h % 100 < 15 ? SLOT_CAPACITY : (h >>> 8) % 8;
}

/** Same date offset, moved off Friday (the weekly holiday) when needed. */
function dayOffset(now: Date, days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  if (date.getDay() === 5) date.setDate(date.getDate() + (days >= 0 ? 1 : -1));
  return toIsoDate(date);
}

function createStore(now: Date): BookingStore {
  const store = new BookingStore({ doctors, initialBooked });
  const userId = currentUser.userId;
  const patientName = currentUser.name.en;
  // Upcoming: Dr. Farhana Akter, Dhaka Care Hospital, in two days at 10:30, serial 7.
  store.seed({
    userId,
    patientName,
    status: 'booked',
    serialNo: 7,
    slotId: makeSlotId('d-h-dhaka-1-1', dayOffset(now, 2), '10:30'),
  });
  // History.
  store.seed({
    userId,
    patientName,
    status: 'completed',
    serialNo: 4,
    slotId: makeSlotId('d-h-dhaka-4-1', dayOffset(now, -9), '09:00'),
  });
  store.seed({
    userId,
    patientName,
    status: 'cancelled',
    serialNo: 2,
    slotId: makeSlotId('d-h-dhaka-1-1', dayOffset(now, -4), '15:00'),
  });
  store.seed({
    userId,
    patientName,
    status: 'missed',
    serialNo: 9,
    slotId: makeSlotId('d-h-dhaka-2-1', dayOffset(now, -20), '18:00'),
  });
  return store;
}

let store = createStore(new Date());
let health = createHealthStore(currentUser.userId, new Date());
/** Saved chat for the logged-in demo user, and thumbs up/down per assistant message. */
let chatHistory: ChatMessage[] = [];
let chatFeedback = new Map<string, ChatFeedback>();

/** Test helper: feedback stored by the mock. */
export const mockChatFeedback = () => new Map(chatFeedback);

/** Test helper: direct access to the in-memory booking store. */
export const mockBookingStore = () => store;

const doctorById = new Map(doctors.map((d) => [d.doctorId, d]));
const hospitalById = new Map(hospitals.map((h) => [h.hospitalId, h]));

function toAppointment(stored: StoredAppointment): Appointment {
  const slot = store.getSlot(stored.slotId);
  const doctor = doctorById.get(slot.doctorId);
  const hospital = hospitalById.get(slot.hospitalId);
  if (!doctor || !hospital) throw new Error(`Unknown doctor or hospital for ${stored.slotId}`);
  return { ...stored, slot, doctor, hospital };
}

function myAppointments(): Appointment[] {
  return store
    .appointmentsFor(currentUser.userId)
    .map(toAppointment)
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start));
}

function hospitalSummaries(now: Date): HospitalSummary[] {
  const beds = new Map(bedAvailability(now).map((b) => [b.hospitalId, b]));
  return hospitals.flatMap((hospital) => {
    const bed = beds.get(hospital.hospitalId);
    return bed ? [{ hospital, beds: bed }] : [];
  });
}

let delayMs = 400;

/** Tests call this between cases so in-memory changes do not leak. */
export function resetMockState() {
  currentUser.alertDivisions = [];
  store = createStore(new Date());
  health = createHealthStore(currentUser.userId, new Date());
  chatHistory = [];
  chatFeedback = new Map();
}

/** Tests set this to 0. */
export function setMockDelay(ms: number) {
  delayMs = ms;
}

type Scenario = 'normal' | 'empty' | 'error' | 'stale' | 'race';
const SCENARIOS: Scenario[] = ['empty', 'error', 'stale', 'race'];

function scenario(): Scenario {
  if (typeof window === 'undefined') return 'normal';
  const value = new URLSearchParams(window.location.search).get('mock') as Scenario | null;
  return value && SCENARIOS.includes(value) ? value : 'normal';
}

export class MockApiError extends Error {}

async function respond<T>(build: () => T, empty: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const mode = scenario();
  if (mode === 'error') throw new MockApiError('Simulated network error');
  if (mode === 'empty') return empty;
  return build();
}

/** Writes ignore the "empty" scenario (they act on the real in-memory store). */
async function mutate<T>(run: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (scenario() === 'error') throw new MockApiError('Simulated network error');
  return run();
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

/** The assistant "thinks" for 600–1200 ms (0 in tests). */
async function think() {
  const ms = delayMs === 0 ? 0 : 600 + Math.round(Math.random() * 600);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function nextDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
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

  getNextAppointment: () =>
    respond<Appointment | null>(() => {
      const now = new Date();
      return (
        myAppointments().find((a) => a.status === 'booked' && new Date(a.slot.start) > now) ?? null
      );
    }, null),

  getHospitals: () => respond<HospitalSummary[]>(() => hospitalSummaries(new Date()), []),

  getHospital: (hospitalId: string) =>
    respond<HospitalSummary | null>(
      () => hospitalSummaries(new Date()).find((s) => s.hospital.hospitalId === hospitalId) ?? null,
      null,
    ),

  getDoctors: (hospitalId: string) =>
    respond<Doctor[]>(() => doctors.filter((d) => d.hospitalId === hospitalId), []),

  /** Sessions for one doctor on one day (yyyy-mm-dd). */
  getSlots: (doctorId: string, isoDate: string) =>
    respond<Slot[]>(() => store.listSlots(doctorId, isoDate, new Date()), []),

  getAppointments: () => respond<Appointment[]>(myAppointments, []),

  bookAppointment: (slotId: string, patientName: string) =>
    mutate<Appointment>(() => {
      if (scenario() === 'race') store.fillSlot(slotId);
      return toAppointment(
        store.book({ userId: currentUser.userId, slotId, patientName, now: new Date() }),
      );
    }),

  cancelAppointment: (appointmentId: string) =>
    mutate<Appointment>(() => toAppointment(store.cancel(appointmentId, currentUser.userId))),

  rescheduleAppointment: (appointmentId: string, newSlotId: string) =>
    mutate<Appointment>(() => {
      if (scenario() === 'race') store.fillSlot(newSlotId);
      return toAppointment(
        store.reschedule({
          appointmentId,
          userId: currentUser.userId,
          newSlotId,
          now: new Date(),
        }),
      );
    }),

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

  getLastTriageResult: () =>
    respond<TriageResult | null>(() => health.getLastTriage(currentUser.userId), null),

  saveTriageResult: (outcome: TriageOutcome, answers: TriageAnswers) =>
    mutate<TriageResult>(() => health.saveTriage(currentUser.userId, outcome, answers, new Date())),

  getFeverLog: () => respond<FeverLogEntry[]>(() => health.listFeverLog(currentUser.userId), []),

  addFeverLogEntry: (input: FeverLogInput) =>
    mutate<FeverLogEntry>(() => health.addFeverEntry(currentUser.userId, input)),

  updateFeverLogEntry: (entryId: string, input: FeverLogInput) =>
    mutate<FeverLogEntry>(() => health.updateFeverEntry(currentUser.userId, entryId, input)),

  deleteFeverLogEntry: (entryId: string) =>
    mutate<{ entryId: string }>(() => {
      health.deleteFeverEntry(currentUser.userId, entryId);
      return { entryId };
    }),

  getLabs: () => respond<Lab[]>(() => labs, []),

  sendChatMessage: async (text: string, ctx: ChatContext): Promise<ChatReply> => {
    await think();
    if (scenario() === 'error') throw new MockApiError('Simulated network error');
    const now = new Date();
    return answerQuestion(text, ctx, {
      divisions,
      hospitals: hospitalSummaries(now),
      labs,
      doctors,
      listSlots: (doctorId, day) => store.listSlots(doctorId, day, now),
      days: nextDays(now, 7),
    });
  },

  getChatHistory: () => respond<ChatMessage[]>(() => chatHistory.map((m) => ({ ...m })), []),

  saveChatHistory: (messages: ChatMessage[]) =>
    mutate<{ count: number }>(() => {
      chatHistory = messages.map((m) => ({ ...m }));
      return { count: chatHistory.length };
    }),

  clearChatHistory: () =>
    mutate<{ count: number }>(() => {
      chatHistory = [];
      return { count: 0 };
    }),

  sendChatFeedback: (messageId: string, feedback: ChatFeedback | null) =>
    mutate<{ messageId: string }>(() => {
      if (feedback) chatFeedback.set(messageId, feedback);
      else chatFeedback.delete(messageId);
      return { messageId };
    }),

  getChecklist: () =>
    respond<PreventionChecklist>(() => health.getChecklist(currentUser.userId), {
      checked: [],
      updatedAt: '',
    }),

  saveChecklist: (checked: string[]) =>
    mutate<PreventionChecklist>(() =>
      health.saveChecklist(currentUser.userId, checked, new Date()),
    ),
};
