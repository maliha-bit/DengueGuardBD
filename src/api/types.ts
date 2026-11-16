/**
 * API types. Entity names follow the SRS ERD (USER, FORECAST, HOSPITAL, BED_AVAILABILITY,
 * SLOT, APPOINTMENT, NOTIFICATION). Fields will be aligned with the FastAPI schema later.
 */

/** Text that the API returns in both languages. */
export interface LocalizedText {
  en: string;
  bn: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export type DivisionId =
  'dhaka' | 'chattogram' | 'khulna' | 'rajshahi' | 'barishal' | 'sylhet' | 'rangpur' | 'mymensingh';

export interface Division {
  divisionId: DivisionId;
  name: LocalizedText;
  /** Map position [lat, lng] (divisional headquarters). */
  center: [number, number];
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
export interface Hospital {
  hospitalId: string;
  name: LocalizedText;
  divisionId: DivisionId;
  district: LocalizedText;
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

export interface Doctor {
  doctorId: string;
  name: LocalizedText;
  specialty: LocalizedText;
}

/** SLOT */
export interface Slot {
  slotId: string;
  doctorId: string;
  hospitalId: string;
  start: string;
}

/** APPOINTMENT */
export interface Appointment {
  appointmentId: string;
  userId: string;
  status: 'booked' | 'cancelled' | 'completed';
  serialNo: number;
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
