/**
 * API types. Entity names follow the SRS ERD (USER, FORECAST, HOSPITAL, BED_AVAILABILITY,
 * SLOT, APPOINTMENT, NOTIFICATION). Triage, fever-log and checklist types are frontend-only
 * records until the backend schema exists. Fields will be aligned with the FastAPI schema later.
 */

/** Text that the API returns in both languages. */
export interface LocalizedText {
  en: string;
  bn: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export type DivisionId =
  'dhaka' | 'chattogram' | 'khulna' | 'rajshahi' | 'barishal' | 'sylhet' | 'rangpur' | 'mymensingh';

export interface District {
  districtId: string;
  name: LocalizedText;
  /** Map position [lat, lng] (district town). */
  center: [number, number];
}

export interface Division {
  divisionId: DivisionId;
  name: LocalizedText;
  /** Map position [lat, lng] (divisional headquarters). */
  center: [number, number];
  districts: District[];
}

export type Role = 'citizen' | 'donor' | 'hospital_staff' | 'lab_staff' | 'authority' | 'admin';

/** USER */
export interface User {
  userId: string;
  name: LocalizedText;
  role: Role;
  divisionId: DivisionId;
  /** Divisions the user receives risk-change alerts for. */
  alertDivisions: DivisionId[];
}

/** FORECAST — one division, one target day. */
export interface Forecast {
  forecastId: string;
  divisionId: DivisionId;
  /** ISO date (yyyy-mm-dd) the forecast is for. */
  targetDate: string;
  predictedCases: number;
  riskLevel: RiskLevel;
  /** ISO timestamp the model run produced this forecast. */
  generatedAt: string;
}

/** Latest 7-day forecast run for all divisions. */
export interface ForecastRun {
  generatedAt: string;
  /** The 7 target dates, in order. */
  days: string[];
  forecasts: Forecast[];
}

/** HOSPITAL */
export type HospitalType = 'government' | 'private';

export interface Hospital {
  hospitalId: string;
  name: LocalizedText;
  type: HospitalType;
  divisionId: DivisionId;
  districtId: string;
  district: LocalizedText;
  address: LocalizedText;
  /** E.164 phone number for tel: links. */
  phone: string;
  /** [lat, lng] */
  location: [number, number];
  /** Has a 24-hour emergency department. */
  hasEmergency: boolean;
}

/** Hospital with its latest bed availability (search results). */
export interface HospitalSummary {
  hospital: Hospital;
  beds: BedAvailability;
}

/** BED_AVAILABILITY */
export interface BedAvailability {
  hospitalId: string;
  generalTotal: number;
  generalAvailable: number;
  icuTotal: number;
  icuAvailable: number;
  updatedAt: string;
}

/** Division-level bed totals for the dashboard. */
export interface BedSummary {
  divisionId: DivisionId;
  hospitalCount: number;
  generalAvailable: number;
  icuAvailable: number;
  /** Oldest update among the hospitals counted (for the freshness label). */
  updatedAt: string;
}

/** 0 = Sunday … 6 = Saturday (JavaScript Date.getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Doctor {
  doctorId: string;
  hospitalId: string;
  name: LocalizedText;
  specialty: LocalizedText;
  availableDays: Weekday[];
}

/** SLOT — one consultation session with a fixed number of serial places. */
export interface Slot {
  slotId: string;
  doctorId: string;
  hospitalId: string;
  start: string;
  capacity: number;
  booked: number;
}

export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'missed';

/** APPOINTMENT */
export interface Appointment {
  appointmentId: string;
  userId: string;
  status: AppointmentStatus;
  serialNo: number;
  patientName: string;
  slot: Slot;
  doctor: Doctor;
  hospital: Hospital;
}

/** NOTIFICATION */
export interface Notification {
  notificationId: string;
  kind: 'risk_alert' | 'appointment' | 'donor_request';
  title: LocalizedText;
  body: LocalizedText;
  createdAt: string;
  read: boolean;
}

export type TrendPeriod = 'weekly' | 'monthly';

export interface CaseTrendPoint {
  /** ISO date: a day (weekly) or the first day of a month (monthly). */
  date: string;
  cases: number;
  /** true when the value is a model forecast rather than a reported count. */
  isForecast: boolean;
}

export interface CaseTrend {
  divisionId: DivisionId;
  period: TrendPeriod;
  points: CaseTrendPoint[];
}

export type DriverFactor = 'rainfall' | 'humidity' | 'temperature' | 'sunshine';
export type DriverUnit = 'mm' | 'percent' | 'celsius' | 'hours';

/** One weather factor behind a division's forecast. */
export interface ForecastDriver {
  factor: DriverFactor;
  value: number;
  unit: DriverUnit;
  /** Whether this factor pushes the forecast risk up or down. */
  direction: 'raises' | 'lowers';
  weight: 'strong' | 'moderate' | 'weak';
}

export interface DivisionDrivers {
  divisionId: DivisionId;
  /** Ordered by influence, strongest first. */
  drivers: ForecastDriver[];
  observedAt: string;
}

export interface PreventionTip {
  tipId: string;
  text: LocalizedText;
}

/* ---------- Symptom checker (UC14) ---------- */

export type AgeGroup = 'under5' | 'child' | 'adult' | 'senior';
export type FeverDays = 'none' | 'oneToTwo' | 'threeToFive' | 'sixPlus';
export type Symptom = 'headache' | 'eyePain' | 'bodyAche' | 'rash' | 'nausea';
export type WarningSign =
  | 'bellyPain'
  | 'vomiting'
  | 'bleeding'
  | 'bloodInVomitOrStool'
  | 'drowsiness'
  | 'coldClammySkin'
  | 'lowUrine';
export type RiskFactor = 'pregnancy' | 'chronicIllness';

export interface TriageAnswers {
  ageGroup: AgeGroup;
  feverDays: FeverDays;
  symptoms: Symptom[];
  warningSigns: WarningSign[];
  riskFactors: RiskFactor[];
}

export type TriageOutcome = 'monitor' | 'doctor' | 'emergency';

/** Last symptom-check result, saved for logged-in users only. */
export interface TriageResult {
  resultId: string;
  userId: string;
  outcome: TriageOutcome;
  answers: TriageAnswers;
  createdAt: string;
}

/* ---------- Fever and fluid log (UC16) ---------- */

export type UrineOutput = 'normal' | 'less';

export interface FeverLogEntry {
  entryId: string;
  userId: string;
  /** yyyy-mm-dd */
  date: string;
  /** Always stored in °C. */
  temperatureC: number;
  /** Glasses (~250 ml). */
  fluidGlasses: number;
  urine: UrineOutput;
  warningSigns: WarningSign[];
}

export type FeverLogInput = Omit<FeverLogEntry, 'entryId' | 'userId'>;

/* ---------- Prevention checklist (UC15) ---------- */

export interface PreventionChecklist {
  /** Ids of ticked checklist items. */
  checked: string[];
  updatedAt: string;
}

/* ---------- Labs (LAB, LAB_TEST) ---------- */

export type LabTestCode = 'ns1' | 'igm_igg' | 'cbc';

/** LAB_TEST */
export interface LabTest {
  testId: string;
  labId: string;
  code: LabTestCode;
  /** Simulated lowest price in BDT, as reported by the lab. */
  priceBdt: number;
  /** Simulated highest price in BDT (e.g. home collection or urgent report). */
  priceMaxBdt: number;
  /** Typical time until the report is ready. */
  turnaroundHours: number;
}

/** LAB */
export interface Lab {
  labId: string;
  name: LocalizedText;
  type: HospitalType;
  divisionId: DivisionId;
  districtId: string;
  district: LocalizedText;
  address: LocalizedText;
  phone: string;
  location: [number, number];
  homeCollection: boolean;
  /** Daily opening hours ("08:00"–"22:00"); null = open 24 hours. */
  openingHours: { opens: string; closes: string } | null;
  /** When the lab last updated its tests and prices. */
  updatedAt: string;
  tests: LabTest[];
}

/* ---------- Chatbot (UC18–UC20) ---------- */

export type ChatLang = 'en' | 'bn';
export type ChatSource = 'dghs' | 'who';

export interface ChatAnswer {
  answerId: string;
  /** Already in the reply language. */
  text: string;
  sources: ChatSource[];
}

export type ChatTool =
  | { kind: 'hospitals'; divisionId: DivisionId; hospitalIds: string[] }
  /** Empty divisionIds = "highest risk today". */
  | { kind: 'risk'; divisionIds: DivisionId[] }
  | { kind: 'labs'; divisionId: DivisionId; labIds: string[] }
  | {
      kind: 'booking';
      divisionId: DivisionId;
      /** Null when no free slot was found in the next 7 days. */
      suggestion: { hospital: Hospital; doctor: Doctor; slot: Slot } | null;
    };

/** Sent with each question so answers can use the user's division and UI language. */
export interface ChatContext {
  divisionId: DivisionId;
  /** UI language, used when the text has no letters. */
  uiLang: ChatLang;
}

/** What the chat service returns for one question. Both null = "not sure" fallback. */
export interface ChatReply {
  lang: ChatLang;
  answer: ChatAnswer | null;
  tool: ChatTool | null;
}

export type RedFlagId =
  | 'bleeding'
  | 'bellyPain'
  | 'vomiting'
  | 'drowsiness'
  | 'breathing'
  | 'coldSkin'
  | 'fainting'
  | 'lowUrine';

export type ChatContent =
  | { type: 'user'; text: string }
  | { type: 'reply'; answer: ChatAnswer | null; tool: ChatTool | null }
  | { type: 'redFlag'; flags: RedFlagId[] }
  | { type: 'error'; question: string };

export type ChatFeedback = 'up' | 'down';

export interface ChatMessage {
  messageId: string;
  role: 'user' | 'assistant';
  createdAt: string;
  /** Language of the message (assistant replies follow the user's language). */
  lang: ChatLang;
  content: ChatContent;
  feedback?: ChatFeedback;
}

/* ---------- Blood / platelet donors (DONOR_PROFILE, DONOR_REQUEST) ---------- */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type DonationType = 'whole_blood' | 'platelets' | 'both';

/** DONOR_PROFILE — the donor's own view (includes their phone). */
export interface DonorProfile {
  donorId: string;
  userId: string;
  name: LocalizedText;
  bloodGroup: BloodGroup;
  donationType: DonationType;
  divisionId: DivisionId;
  districtId: string;
  district: LocalizedText;
  /** yyyy-mm-dd, or null if never donated. */
  lastDonationDate: string | null;
  phone: string;
  /** Contact is shared only after the donor accepts a request. */
  shareAfterAccept: boolean;
  available: boolean;
  lastActiveAt: string;
}

export type DonorProfileInput = Pick<
  DonorProfile,
  'bloodGroup' | 'donationType' | 'districtId' | 'lastDonationDate' | 'phone' | 'shareAfterAccept'
>;

/** Public donor card: the phone is masked by the API (e.g. 01XXX-XXX-123). */
export type DonorListing = Omit<DonorProfile, 'phone' | 'userId' | 'shareAfterAccept'> & {
  maskedPhone: string;
};

export type DonorRequestStatus = 'sent' | 'accepted' | 'declined' | 'fulfilled' | 'expired';

export interface DonorRequestInput {
  donorId: string;
  patientBloodGroup: BloodGroup;
  hospitalId: string;
  unitsNeeded: number;
  /** ISO timestamp. */
  neededBy: string;
  contactPhone: string;
  note: string;
}

/** DONOR_REQUEST */
export interface DonorRequest extends Omit<DonorRequestInput, 'contactPhone'> {
  requestId: string;
  requesterId: string;
  requesterName: LocalizedText;
  hospital: Hospital;
  donor: DonorListing;
  status: DonorRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  closedAt: string | null;
  /** Donor's phone — only present once the donor has accepted. */
  donorPhone: string | null;
  /** Requester's phone — only present for the donor once they have accepted. */
  contactPhone: string | null;
}

export type MisuseReason = 'fake' | 'spam' | 'abusive' | 'payment' | 'other';

/* ---------- Breeding-site reports (BREEDING_REPORT) ---------- */

export type BreedingSiteType = 'standing_water' | 'drain' | 'tyres' | 'construction' | 'other';
export type BreedingReportStatus = 'submitted' | 'under_review' | 'action_taken' | 'rejected';

export interface BreedingReportInput {
  /** Data URL of the photo (mock); the backend will take a file upload. */
  photoUrl: string | null;
  location: [number, number];
  areaName: string;
  siteType: BreedingSiteType;
  note: string;
}

/** BREEDING_REPORT */
export interface BreedingReport extends BreedingReportInput {
  reportId: string;
  /** Reference number shown to the citizen, e.g. BR-2026-000123. */
  reference: string;
  userId: string;
  status: BreedingReportStatus;
  createdAt: string;
  updatedAt: string;
}
