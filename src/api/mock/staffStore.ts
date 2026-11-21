/**
 * In-memory staff-portal data for the mock API (SIMULATED: fictional people, numbers and
 * organisations). Holds demo staff accounts and approvals, bed updates, doctors and their
 * schedules, published slots, the hospital's appointments, lab listings, prevention tasks,
 * chatbot sources, forecast runs, directory flags and the audit trail.
 *
 * Every staff or admin change goes through a method that writes an audit entry.
 */
import { validateBedCount } from '@/lib/beds';
import { toIsoDate } from '@/lib/format';
import { findOverlaps, generateSlots, hasInvalidRanges } from '@/lib/slots';
import type {
  ApprovalStatus,
  AuditAction,
  AuditEntry,
  BedAvailability,
  BedUpdateInput,
  DayHours,
  DirectoryEditInput,
  DirectoryUser,
  DivisionId,
  Doctor,
  ForecastJob,
  Hospital,
  HospitalAppointment,
  KnowledgeSource,
  KnowledgeSourceInput,
  Lab,
  LabListingInput,
  LocalizedText,
  PreventionTask,
  PreventionTaskInput,
  PreventionTaskStatus,
  PublishedSlot,
  Role,
  SlotDraft,
  SlotGeneratorInput,
  StaffDoctor,
  StaffDoctorInput,
  StaffSignup,
  Weekday,
  WeeklyScheduleDay,
} from '../types';

/* ---------- demo accounts ---------- */

export type DemoAccountId =
  | 'citizen'
  | 'donor'
  | 'hospital_staff'
  | 'lab_staff'
  | 'authority'
  | 'admin'
  | 'hospital_staff_new';

export interface DemoAccount {
  id: DemoAccountId;
  userId: string;
  role: Role;
  name: LocalizedText;
  divisionId: DivisionId;
  organisationId?: string;
}

/** The hospital and lab the demo staff accounts work for. */
export const STAFF_HOSPITAL_ID = 'h-dhaka-1';
export const STAFF_LAB_ID = 'l-dhaka-1';

const CITIZEN_NAME: LocalizedText = { en: 'Ayesha Rahman', bn: 'আয়েশা রহমান' };

export const DEMO_ACCOUNT_IDS: DemoAccountId[] = [
  'citizen',
  'donor',
  'hospital_staff',
  'lab_staff',
  'authority',
  'admin',
  'hospital_staff_new',
];

export const DEMO_ACCOUNTS: Record<DemoAccountId, DemoAccount> = {
  citizen: {
    id: 'citizen',
    userId: 'u-demo-1',
    role: 'citizen',
    name: CITIZEN_NAME,
    divisionId: 'dhaka',
  },
  donor: {
    id: 'donor',
    userId: 'u-demo-2',
    role: 'donor',
    name: CITIZEN_NAME,
    divisionId: 'dhaka',
  },
  hospital_staff: {
    id: 'hospital_staff',
    userId: 'u-staff-1',
    role: 'hospital_staff',
    name: { en: 'Nasima Khatun', bn: 'নাসিমা খাতুন' },
    divisionId: 'dhaka',
    organisationId: STAFF_HOSPITAL_ID,
  },
  lab_staff: {
    id: 'lab_staff',
    userId: 'u-staff-2',
    role: 'lab_staff',
    name: { en: 'Jahid Hasan', bn: 'জাহিদ হাসান' },
    divisionId: 'dhaka',
    organisationId: STAFF_LAB_ID,
  },
  authority: {
    id: 'authority',
    userId: 'u-staff-3',
    role: 'authority',
    name: { en: 'Mahbub Alam', bn: 'মাহবুব আলম' },
    divisionId: 'dhaka',
  },
  admin: {
    id: 'admin',
    userId: 'u-admin-1',
    role: 'admin',
    name: { en: 'Sultana Parvin', bn: 'সুলতানা পারভীন' },
    divisionId: 'dhaka',
  },
  /** A new hospital staff sign-up that an admin has not approved yet. */
  hospital_staff_new: {
    id: 'hospital_staff_new',
    userId: 'u-staff-4',
    role: 'hospital_staff',
    name: { en: 'Rafiq Uddin', bn: 'রফিক উদ্দিন' },
    divisionId: 'dhaka',
    organisationId: STAFF_HOSPITAL_ID,
  },
};

export type StaffErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_BEDS'
  | 'INVALID_SCHEDULE'
  | 'SLOT_OVERLAP'
  | 'NO_SLOTS'
  | 'INVALID_STATUS'
  | 'JOB_RUNNING'
  | 'OWN_ACCOUNT'
  | 'FORBIDDEN';

export class StaffError extends Error {
  constructor(readonly code: StaffErrorCode) {
    super(code);
    this.name = 'StaffError';
  }
}

export const isStaffError = (error: unknown): error is StaffError => error instanceof StaffError;

export interface Actor {
  name: LocalizedText;
  role: Role;
  userId: string;
}

const text = (value: string): LocalizedText => ({ en: value, bn: value });

/** Default weekly hours for a lab listing created from its daily opening hours. */
export function weeklyHoursFrom(lab: Pick<Lab, 'openingHours' | 'weeklyHours'>): DayHours[] {
  if (lab.weeklyHours) return lab.weeklyHours.map((h) => ({ ...h }));
  const daily: DayHours = lab.openingHours
    ? { kind: 'hours', ...lab.openingHours }
    : { kind: 'allDay' };
  return Array.from({ length: 7 }, () => ({ ...daily }));
}

/** Today's opening hours for citizens (closed days show as an empty range). */
function todaysHours(weekly: DayHours[], now: Date): Lab['openingHours'] {
  const today = weekly[now.getDay()] ?? { kind: 'allDay' };
  if (today.kind === 'allDay') return null;
  if (today.kind === 'closed') return { opens: '00:00', closes: '00:00' };
  return { opens: today.opens, closes: today.closes };
}

export interface StaffStoreOptions {
  hospitals: Hospital[];
  labs: Lab[];
  doctors: Doctor[];
  now: () => Date;
  /** How long a forecast run takes (0 in tests). */
  jobDurationMs: () => number;
}

export class StaffStore {
  private signups: StaffSignup[] = [];
  private bedOverrides = new Map<string, BedAvailability>();
  private hospitalEdits = new Map<string, { name: LocalizedText; phone: string }>();
  private inactiveHospitals = new Set<string>();
  private labOverrides = new Map<string, Lab>();
  private labEdits = new Map<string, { name: LocalizedText; phone: string }>();
  private inactiveLabs = new Set<string>();
  private users: DirectoryUser[] = [];
  private donorFlags = new Set<string>();
  private doctors: StaffDoctor[] = [];
  private slots: PublishedSlot[] = [];
  private appointments: HospitalAppointment[] = [];
  private tasks: PreventionTask[] = [];
  private sources: KnowledgeSource[] = [];
  private jobs: ForecastJob[] = [];
  private audit: AuditEntry[] = [];
  /** Set when a forecast run finishes; the forecast API reports it as "last updated". */
  forecastGeneratedAt: string | null = null;
  private nextId = 1;

  constructor(private readonly options: StaffStoreOptions) {}

  private get now() {
    return this.options.now();
  }

  private id(prefix: string) {
    return `${prefix}-${this.nextId++}`;
  }

  /* ---------- audit ---------- */

  log(actor: Actor, action: AuditAction, target: LocalizedText) {
    this.audit.push({
      auditId: this.id('au'),
      actorName: actor.name,
      actorRole: actor.role,
      action,
      target,
      createdAt: this.now.toISOString(),
    });
  }

  /** Newest first. */
  listAudit(): AuditEntry[] {
    return [...this.audit].reverse().map((e) => ({ ...e }));
  }

  /* ---------- approvals ---------- */

  addSignup(signup: StaffSignup) {
    this.signups.push(signup);
  }

  /** Staff accounts without a sign-up record were approved before this demo started. */
  approvalOf(userId: string): ApprovalStatus {
    return this.signups.find((s) => s.userId === userId)?.status ?? 'approved';
  }

  listSignups(): StaffSignup[] {
    return [...this.signups]
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((s) => ({ ...s }));
  }

  decideSignup(actor: Actor, signupId: string, approve: boolean, reason: string): StaffSignup {
    const signup = this.signups.find((s) => s.signupId === signupId);
    if (!signup) throw new StaffError('NOT_FOUND');
    if (signup.status !== 'pending') throw new StaffError('INVALID_STATUS');
    signup.status = approve ? 'approved' : 'rejected';
    signup.decidedAt = this.now.toISOString();
    signup.rejectReason = approve ? null : reason.trim();
    this.log(actor, approve ? 'signup_approve' : 'signup_reject', signup.name);
    return { ...signup };
  }

  /* ---------- hospitals and beds ---------- */

  private hospitalById(hospitalId: string): Hospital {
    const hospital = this.options.hospitals.find((h) => h.hospitalId === hospitalId);
    if (!hospital) throw new StaffError('NOT_FOUND');
    return this.applyHospital(hospital);
  }

  applyHospital(hospital: Hospital): Hospital {
    const edit = this.hospitalEdits.get(hospital.hospitalId);
    return edit ? { ...hospital, ...edit } : hospital;
  }

  isHospitalActive = (hospitalId: string) => !this.inactiveHospitals.has(hospitalId);

  /** Seeded bed numbers with staff updates applied. */
  applyBeds(base: BedAvailability[]): BedAvailability[] {
    return base.map((b) => ({ ...(this.bedOverrides.get(b.hospitalId) ?? b) }));
  }

  updateBeds(actor: Actor, current: BedAvailability, input: BedUpdateInput): BedAvailability {
    if (
      validateBedCount(input.generalAvailable, current.generalTotal) ||
      validateBedCount(input.icuAvailable, current.icuTotal)
    ) {
      throw new StaffError('INVALID_BEDS');
    }
    const next: BedAvailability = {
      ...current,
      generalAvailable: input.generalAvailable,
      icuAvailable: input.icuAvailable,
      updatedAt: this.now.toISOString(),
    };
    this.bedOverrides.set(current.hospitalId, next);
    this.log(actor, 'beds_update', this.hospitalById(current.hospitalId).name);
    return { ...next };
  }

  editHospital(actor: Actor, hospitalId: string, input: DirectoryEditInput): Hospital {
    this.hospitalById(hospitalId);
    this.hospitalEdits.set(hospitalId, {
      name: { en: input.name.trim(), bn: input.nameBn.trim() },
      phone: input.phone.trim(),
    });
    const hospital = this.hospitalById(hospitalId);
    this.log(actor, 'hospital_update', hospital.name);
    return hospital;
  }

  setHospitalActive(actor: Actor, hospitalId: string, active: boolean) {
    const hospital = this.hospitalById(hospitalId);
    if (active) this.inactiveHospitals.delete(hospitalId);
    else this.inactiveHospitals.add(hospitalId);
    this.log(actor, active ? 'hospital_activate' : 'hospital_deactivate', hospital.name);
  }

  /* ---------- doctors, schedules, slots ---------- */

  addSeedDoctor(doctor: StaffDoctor) {
    this.doctors.push(doctor);
  }

  doctorsOf(hospitalId: string): StaffDoctor[] {
    return this.doctors
      .filter((d) => d.hospitalId === hospitalId)
      .map((d) => ({ ...d, schedule: d.schedule.map((s) => ({ ...s, ranges: [...s.ranges] })) }));
  }

  private findDoctor(doctorId: string): StaffDoctor {
    const doctor = this.doctors.find((d) => d.doctorId === doctorId);
    if (!doctor) throw new StaffError('NOT_FOUND');
    return doctor;
  }

  addDoctor(actor: Actor, hospitalId: string, input: StaffDoctorInput): StaffDoctor {
    const doctor: StaffDoctor = {
      doctorId: this.id(`d-${hospitalId}-new`),
      hospitalId,
      name: text(input.name.trim()),
      specialty: text(input.specialty.trim()),
      availableDays: [],
      phone: input.phone.trim(),
      active: true,
      schedule: [],
    };
    this.doctors.push(doctor);
    this.log(actor, 'doctor_create', doctor.name);
    return { ...doctor };
  }

  editDoctor(actor: Actor, doctorId: string, input: StaffDoctorInput): StaffDoctor {
    const doctor = this.findDoctor(doctorId);
    // Keep the Bangla name when the English one is unchanged.
    if (doctor.name.en !== input.name.trim()) doctor.name = text(input.name.trim());
    if (doctor.specialty.en !== input.specialty.trim()) {
      doctor.specialty = text(input.specialty.trim());
    }
    doctor.phone = input.phone.trim();
    this.log(actor, 'doctor_update', doctor.name);
    return { ...doctor };
  }

  setDoctorActive(actor: Actor, doctorId: string, active: boolean): StaffDoctor {
    const doctor = this.findDoctor(doctorId);
    doctor.active = active;
    this.log(actor, active ? 'doctor_activate' : 'doctor_deactivate', doctor.name);
    return { ...doctor };
  }

  saveSchedule(actor: Actor, doctorId: string, schedule: WeeklyScheduleDay[]): StaffDoctor {
    const doctor = this.findDoctor(doctorId);
    if (schedule.some((day) => hasInvalidRanges(day.ranges))) {
      throw new StaffError('INVALID_SCHEDULE');
    }
    doctor.schedule = schedule
      .filter((day) => day.ranges.length > 0)
      .sort((a, b) => a.day - b.day)
      .map((day) => ({ day: day.day, ranges: day.ranges.map((r) => ({ ...r })) }));
    doctor.availableDays = doctor.schedule.map((s) => s.day);
    this.log(actor, 'schedule_update', doctor.name);
    return { ...doctor };
  }

  addSeedSlot(slot: PublishedSlot) {
    this.slots.push(slot);
  }

  slotsOf(hospitalId: string): PublishedSlot[] {
    return this.slots
      .filter((s) => s.hospitalId === hospitalId)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((s) => ({ ...s }));
  }

  /** Drafts for the generator plus the ones that clash with published slots. */
  previewSlots(input: SlotGeneratorInput): { drafts: SlotDraft[]; overlaps: SlotDraft[] } {
    const doctor = this.findDoctor(input.doctorId);
    const drafts = generateSlots(input, doctor.schedule);
    return { drafts, overlaps: findOverlaps(drafts, this.slots) };
  }

  publishSlots(actor: Actor, input: SlotGeneratorInput): PublishedSlot[] {
    const doctor = this.findDoctor(input.doctorId);
    const { drafts, overlaps } = this.previewSlots(input);
    if (drafts.length === 0) throw new StaffError('NO_SLOTS');
    if (overlaps.length > 0) throw new StaffError('SLOT_OVERLAP');
    const published = drafts.map<PublishedSlot>((draft) => ({
      slotId: this.id('ps'),
      doctorId: doctor.doctorId,
      hospitalId: doctor.hospitalId,
      start: draft.start,
      end: draft.end,
      capacity: draft.capacity,
      booked: 0,
    }));
    this.slots.push(...published);
    this.log(actor, 'slots_publish', doctor.name);
    return published.map((s) => ({ ...s }));
  }

  /* ---------- the hospital's appointments ---------- */

  addSeedAppointment(appointment: HospitalAppointment) {
    this.appointments.push(appointment);
  }

  appointmentsOn(hospitalId: string, isoDate: string): HospitalAppointment[] {
    const ids = new Set(
      this.doctors.filter((d) => d.hospitalId === hospitalId).map((d) => d.doctorId),
    );
    return this.appointments
      .filter((a) => ids.has(a.doctorId) && toIsoDate(new Date(a.start)) === isoDate)
      .sort((a, b) => a.start.localeCompare(b.start) || a.serialNo - b.serialNo)
      .map((a) => ({ ...a }));
  }

  setAppointmentStatus(
    actor: Actor,
    appointmentId: string,
    status: 'completed' | 'missed',
  ): HospitalAppointment {
    const appointment = this.appointments.find((a) => a.appointmentId === appointmentId);
    if (!appointment) throw new StaffError('NOT_FOUND');
    if (appointment.status !== 'booked') throw new StaffError('INVALID_STATUS');
    appointment.status = status;
    this.log(
      actor,
      status === 'completed' ? 'appointment_completed' : 'appointment_missed',
      text(`#${appointment.serialNo} ${appointment.patientName}`),
    );
    return { ...appointment };
  }

  /* ---------- labs ---------- */

  private baseLab(labId: string): Lab {
    const lab = this.options.labs.find((l) => l.labId === labId);
    if (!lab) throw new StaffError('NOT_FOUND');
    return lab;
  }

  /** The lab as citizens see it: staff listing, admin edits and today's hours applied. */
  getLab(labId: string): Lab {
    const lab = this.labOverrides.get(labId) ?? this.baseLab(labId);
    const edit = this.labEdits.get(labId);
    const merged = edit ? { ...lab, ...edit } : lab;
    const openingHours = merged.weeklyHours
      ? todaysHours(merged.weeklyHours, this.now)
      : merged.openingHours;
    return { ...merged, openingHours, tests: merged.tests.map((t) => ({ ...t })) };
  }

  allLabs(): Lab[] {
    return this.options.labs.map((l) => this.getLab(l.labId));
  }

  isLabActive = (labId: string) => !this.inactiveLabs.has(labId);

  publishLab(actor: Actor, labId: string, input: LabListingInput): Lab {
    const base = this.labOverrides.get(labId) ?? this.baseLab(labId);
    const next: Lab = {
      ...base,
      name: { en: input.name.trim(), bn: input.nameBn.trim() },
      address: { en: input.address.trim(), bn: input.address.trim() },
      phone: input.phone.trim(),
      homeCollection: input.homeCollection,
      weeklyHours: input.weeklyHours.map((h) => ({ ...h })),
      updatedAt: this.now.toISOString(),
      tests: input.tests.map((t) => {
        const existing = base.tests.find((x) => x.code === t.code);
        return {
          testId: `${labId}-${t.code}`,
          labId,
          code: t.code,
          priceBdt: t.priceBdt,
          priceMaxBdt: t.priceMaxBdt,
          turnaroundHours: existing?.turnaroundHours ?? (t.code === 'igm_igg' ? 24 : 6),
        };
      }),
    };
    this.labOverrides.set(labId, next);
    this.labEdits.delete(labId);
    this.log(actor, 'lab_publish', next.name);
    return this.getLab(labId);
  }

  editLab(actor: Actor, labId: string, input: DirectoryEditInput): Lab {
    this.baseLab(labId);
    this.labEdits.set(labId, {
      name: { en: input.name.trim(), bn: input.nameBn.trim() },
      phone: input.phone.trim(),
    });
    const lab = this.getLab(labId);
    this.log(actor, 'lab_update', lab.name);
    return lab;
  }

  setLabActive(actor: Actor, labId: string, active: boolean) {
    const lab = this.getLab(labId);
    if (active) this.inactiveLabs.delete(labId);
    else this.inactiveLabs.add(labId);
    this.log(actor, active ? 'lab_activate' : 'lab_deactivate', lab.name);
  }

  /* ---------- users and donors (directory) ---------- */

  addSeedUser(user: DirectoryUser) {
    this.users.push(user);
  }

  listUsers(): DirectoryUser[] {
    return this.users.map((u) => ({ ...u }));
  }

  private findUser(userId: string) {
    const user = this.users.find((u) => u.userId === userId);
    if (!user) throw new StaffError('NOT_FOUND');
    return user;
  }

  editUser(actor: Actor, userId: string, input: DirectoryEditInput): DirectoryUser {
    const user = this.findUser(userId);
    user.name = { en: input.name.trim(), bn: input.nameBn.trim() };
    user.phone = input.phone.trim();
    this.log(actor, 'user_update', user.name);
    return { ...user };
  }

  setUserActive(actor: Actor, userId: string, active: boolean): DirectoryUser {
    if (userId === actor.userId) throw new StaffError('OWN_ACCOUNT');
    const user = this.findUser(userId);
    user.active = active;
    this.log(actor, active ? 'user_activate' : 'user_deactivate', user.name);
    return { ...user };
  }

  isDonorActive = (donorId: string) => !this.donorFlags.has(donorId);

  setDonorActive(actor: Actor, donorId: string, name: LocalizedText, active: boolean) {
    if (active) this.donorFlags.delete(donorId);
    else this.donorFlags.add(donorId);
    this.log(actor, active ? 'donor_activate' : 'donor_deactivate', name);
  }

  /* ---------- prevention tasks ---------- */

  addSeedTask(task: PreventionTask) {
    this.tasks.push(task);
  }

  listTasks(): PreventionTask[] {
    return [...this.tasks]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((t) => ({ ...t }));
  }

  createTask(actor: Actor, input: PreventionTaskInput): PreventionTask {
    const now = this.now.toISOString();
    const task: PreventionTask = {
      ...input,
      title: input.title.trim(),
      area: input.area.trim(),
      assignedTeam: input.assignedTeam.trim(),
      taskId: this.id('pt'),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(task);
    this.log(actor, 'task_create', text(task.title));
    return { ...task };
  }

  moveTask(actor: Actor, taskId: string, status: PreventionTaskStatus): PreventionTask {
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) throw new StaffError('NOT_FOUND');
    if (task.status === status) throw new StaffError('INVALID_STATUS');
    task.status = status;
    task.updatedAt = this.now.toISOString();
    this.log(actor, 'task_move', text(task.title));
    return { ...task };
  }

  /* ---------- chatbot knowledge sources ---------- */

  addSeedSource(source: KnowledgeSource) {
    this.sources.push(source);
  }

  listSources(): KnowledgeSource[] {
    return this.sources.map((s) => ({ ...s }));
  }

  saveSource(actor: Actor, sourceId: string | null, input: KnowledgeSourceInput): KnowledgeSource {
    if (sourceId) {
      const source = this.sources.find((s) => s.sourceId === sourceId);
      if (!source) throw new StaffError('NOT_FOUND');
      Object.assign(source, input);
      this.log(actor, 'source_update', text(source.title));
      return { ...source };
    }
    const source: KnowledgeSource = { ...input, sourceId: this.id('ks') };
    this.sources.push(source);
    this.log(actor, 'source_create', text(source.title));
    return { ...source };
  }

  removeSource(actor: Actor, sourceId: string) {
    const source = this.sources.find((s) => s.sourceId === sourceId);
    if (!source) throw new StaffError('NOT_FOUND');
    this.sources = this.sources.filter((s) => s.sourceId !== sourceId);
    this.log(actor, 'source_delete', text(source.title));
  }

  /* ---------- forecast runs ---------- */

  addSeedJob(job: ForecastJob) {
    this.jobs.push(job);
  }

  /** Moves running jobs forward in time; a finished run becomes the forecast's "last updated". */
  private advanceJobs() {
    const now = this.now.getTime();
    const duration = this.options.jobDurationMs();
    for (const job of this.jobs) {
      if (job.status !== 'running') continue;
      const elapsed = now - new Date(job.startedAt).getTime();
      job.progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
      if (job.progress >= 1) {
        job.status = 'succeeded';
        job.finishedAt = new Date(
          new Date(job.startedAt).getTime() + Math.max(0, duration),
        ).toISOString();
        this.forecastGeneratedAt = job.finishedAt;
      }
    }
  }

  /** Newest first. */
  listJobs(limit = 5): ForecastJob[] {
    this.advanceJobs();
    return [...this.jobs]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit)
      .map((j) => ({ ...j }));
  }

  getJob(jobId: string): ForecastJob {
    this.advanceJobs();
    const job = this.jobs.find((j) => j.jobId === jobId);
    if (!job) throw new StaffError('NOT_FOUND');
    return { ...job };
  }

  startForecastRun(actor: Actor): ForecastJob {
    this.advanceJobs();
    if (this.jobs.some((j) => j.status === 'running')) throw new StaffError('JOB_RUNNING');
    const job: ForecastJob = {
      jobId: this.id('fj'),
      status: 'running',
      progress: 0,
      startedAt: this.now.toISOString(),
      finishedAt: null,
      triggeredBy: actor.name.en,
    };
    this.jobs.push(job);
    this.log(actor, 'forecast_run', text('Forecast model'));
    this.advanceJobs();
    return { ...job, ...this.getJob(job.jobId) };
  }
}

/* ---------- seed (SIMULATED) ---------- */

const PATIENTS = [
  'Rina Akter',
  'Shafiq Islam',
  'Mou Rahman',
  'Babul Mia',
  'Lima Khatun',
  'Sajid Hasan',
  'Nupur Das',
  'Habib Ullah',
];

const USER_FIRST: LocalizedText[] = [
  { en: 'Sadia', bn: 'সাদিয়া' },
  { en: 'Rakib', bn: 'রাকিব' },
  { en: 'Farida', bn: 'ফরিদা' },
  { en: 'Mizan', bn: 'মিজান' },
  { en: 'Popy', bn: 'পপি' },
  { en: 'Anis', bn: 'আনিস' },
];
const USER_LAST: LocalizedText[] = [
  { en: 'Sarker', bn: 'সরকার' },
  { en: 'Mondal', bn: 'মণ্ডল' },
  { en: 'Talukder', bn: 'তালুকদার' },
  { en: 'Biswas', bn: 'বিশ্বাস' },
];
const DIVISION_IDS: DivisionId[] = [
  'dhaka',
  'chattogram',
  'khulna',
  'rajshahi',
  'barishal',
  'sylhet',
  'rangpur',
  'mymensingh',
];

function atTime(base: Date, dayOffset: number, hhmm: string): Date {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export function createStaffStore(options: StaffStoreOptions): StaffStore {
  const store = new StaffStore(options);
  const start = options.now();
  const hoursAgo = (h: number) => new Date(start.getTime() - h * 3_600_000).toISOString();
  const dayIso = (offset: number) => toIsoDate(atTime(start, offset, '00:00'));

  // Sign-ups: one pending per staff portal (Rafiq is the "new sign-up" demo account).
  const hospitalName = (id: string) =>
    options.hospitals.find((h) => h.hospitalId === id)?.name ?? text(id);
  const labName = (id: string) => options.labs.find((l) => l.labId === id)?.name ?? text(id);
  const signups: StaffSignup[] = [
    {
      signupId: 'su-1',
      userId: DEMO_ACCOUNTS.hospital_staff_new.userId,
      name: DEMO_ACCOUNTS.hospital_staff_new.name,
      role: 'hospital_staff',
      organisation: hospitalName(STAFF_HOSPITAL_ID),
      idDocument: 'rafiq-uddin-staff-id.pdf',
      status: 'pending',
      submittedAt: hoursAgo(5),
      decidedAt: null,
      rejectReason: null,
    },
    {
      signupId: 'su-2',
      userId: 'u-staff-5',
      name: { en: 'Sharmin Akter', bn: 'শারমিন আক্তার' },
      role: 'lab_staff',
      organisation: labName('l-chattogram-1'),
      idDocument: 'sharmin-akter-id.jpg',
      status: 'pending',
      submittedAt: hoursAgo(20),
      decidedAt: null,
      rejectReason: null,
    },
    {
      signupId: 'su-3',
      userId: 'u-staff-6',
      name: { en: 'Kamal Hossain', bn: 'কামাল হোসেন' },
      role: 'authority',
      organisation: { en: 'City Health Office, Khulna', bn: 'সিটি স্বাস্থ্য অফিস, খুলনা' },
      idDocument: 'kamal-hossain-office-letter.pdf',
      status: 'pending',
      submittedAt: hoursAgo(30),
      decidedAt: null,
      rejectReason: null,
    },
    {
      signupId: 'su-4',
      userId: 'u-staff-7',
      name: { en: 'Tanvir Rahman', bn: 'তানভীর রহমান' },
      role: 'hospital_staff',
      organisation: hospitalName('h-sylhet-1'),
      idDocument: 'scan-0042.png',
      status: 'rejected',
      submittedAt: hoursAgo(80),
      decidedAt: hoursAgo(60),
      rejectReason: 'ID document is not readable.',
    },
  ];
  signups.forEach((s) => store.addSignup(s));

  // Doctors of the staff hospital, with weekly schedules from their available days.
  options.doctors
    .filter((d) => d.hospitalId === STAFF_HOSPITAL_ID)
    .forEach((doctor, i) => {
      store.addSeedDoctor({
        ...doctor,
        phone: `0170000${String(5100 + i)}`,
        active: true,
        schedule: doctor.availableDays.map((day: Weekday) => ({
          day,
          ranges:
            i === 0
              ? [
                  { start: '09:00', end: '12:00' },
                  { start: '15:00', end: '18:00' },
                ]
              : [{ start: '10:00', end: '13:00' }],
        })),
      });
    });
  const staffDoctors = store.doctorsOf(STAFF_HOSPITAL_ID);
  const first = staffDoctors[0];

  // Published slots: tomorrow morning for the first doctor (so overlaps can be tried).
  if (first) {
    ['09:00', '09:30', '10:00', '10:30'].forEach((time, i) => {
      const startAt = atTime(start, 1, time);
      store.addSeedSlot({
        slotId: `ps-seed-${i + 1}`,
        doctorId: first.doctorId,
        hospitalId: STAFF_HOSPITAL_ID,
        start: startAt.toISOString(),
        end: new Date(startAt.getTime() + 30 * 60_000).toISOString(),
        capacity: 10,
        booked: 3 + i,
      });
    });
  }

  // Today's appointments at the staff hospital.
  const times = ['09:00', '09:00', '09:30', '10:00', '10:30', '11:00', '15:00', '15:30'];
  times.forEach((time, i) => {
    const doctor = staffDoctors[i % Math.max(1, staffDoctors.length)];
    if (!doctor) return;
    store.addSeedAppointment({
      appointmentId: `ha-${i + 1}`,
      serialNo: i + 1,
      patientName: PATIENTS[i] ?? `Patient ${i + 1}`,
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      start: atTime(start, 0, time).toISOString(),
      status: i === 0 ? 'completed' : i === 1 ? 'missed' : 'booked',
    });
  });

  // Directory users: the demo accounts plus simulated citizens.
  Object.values(DEMO_ACCOUNTS).forEach((account, i) =>
    store.addSeedUser({
      userId: account.userId,
      name: account.name,
      role: account.role,
      divisionId: account.divisionId,
      phone: `0170000${String(6000 + i)}`,
      active: true,
      createdAt: hoursAgo(24 * (40 - i)),
    }),
  );
  for (let i = 0; i < 24; i++) {
    const f = USER_FIRST[i % USER_FIRST.length] ?? CITIZEN_NAME;
    const l = USER_LAST[(i * 3) % USER_LAST.length] ?? CITIZEN_NAME;
    store.addSeedUser({
      userId: `u-citizen-${i + 1}`,
      name: { en: `${f.en} ${l.en}`, bn: `${f.bn} ${l.bn}` },
      role: i % 5 === 4 ? 'donor' : 'citizen',
      divisionId: DIVISION_IDS[i % DIVISION_IDS.length] ?? 'dhaka',
      phone: `0170000${String(7000 + i)}`,
      active: i % 11 !== 10,
      createdAt: hoursAgo(24 * (30 - i)),
    });
  }

  // Prevention tasks (one already overdue).
  const tasks: Array<Omit<PreventionTask, 'taskId' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'Clear drains around Mirpur 10',
      area: 'Mirpur 10, Dhaka',
      divisionId: 'dhaka',
      assignedTeam: 'DNCC Zone 2 team',
      dueDate: dayIso(-2),
      linkedReportId: null,
      status: 'open',
    },
    {
      title: 'Larvicide spraying, Agrabad',
      area: 'Agrabad, Chattogram',
      divisionId: 'chattogram',
      assignedTeam: 'CCC vector control',
      dueDate: dayIso(3),
      linkedReportId: null,
      status: 'in_progress',
    },
    {
      title: 'Remove tyres at Chashara market',
      area: 'Chashara, Narayanganj',
      divisionId: 'dhaka',
      assignedTeam: 'NCC cleaning crew',
      dueDate: dayIso(5),
      linkedReportId: null,
      status: 'open',
    },
    {
      title: 'School yard clean-up, Kandirpar',
      area: 'Kandirpar, Cumilla',
      divisionId: 'chattogram',
      assignedTeam: 'Cumilla city team',
      dueDate: dayIso(-6),
      linkedReportId: null,
      status: 'completed',
    },
    {
      title: 'Awareness miking, Sonadanga',
      area: 'Sonadanga, Khulna',
      divisionId: 'khulna',
      assignedTeam: 'KCC health team',
      dueDate: dayIso(-1),
      linkedReportId: null,
      status: 'cancelled',
    },
  ];
  tasks.forEach((task, i) =>
    store.addSeedTask({
      ...task,
      taskId: `pt-seed-${i + 1}`,
      createdAt: hoursAgo(24 * (8 - i)),
      updatedAt: hoursAgo(24 * (4 - i / 2)),
    }),
  );

  // Chatbot knowledge sources.
  [
    {
      title: 'National Guideline for Clinical Management of Dengue',
      publisher: 'DGHS',
      url: 'https://dghs.gov.bd',
      reviewedOn: dayIso(-45),
    },
    {
      title: 'Dengue and severe dengue (fact sheet)',
      publisher: 'WHO',
      url: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue',
      reviewedOn: dayIso(-30),
    },
    {
      title: 'Dengue: guidelines for diagnosis, treatment, prevention and control',
      publisher: 'WHO',
      url: 'https://www.who.int/publications/i/item/9789241547871',
      reviewedOn: dayIso(-90),
    },
  ].forEach((source, i) => store.addSeedSource({ ...source, sourceId: `ks-seed-${i + 1}` }));

  // Past forecast runs (one failed). Today's 06:00 run matches the forecast's default time.
  const latestRun = atTime(start, 0, '06:00');
  if (latestRun > start) latestRun.setDate(latestRun.getDate() - 1);
  [0, 1, 2, 3, 4].forEach((daysBack) => {
    const startedAt = new Date(latestRun);
    startedAt.setDate(startedAt.getDate() - daysBack);
    const failed = daysBack === 2;
    store.addSeedJob({
      jobId: `fj-seed-${daysBack + 1}`,
      status: failed ? 'failed' : 'succeeded',
      progress: failed ? 0.6 : 1,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date(startedAt.getTime() + 4 * 60_000).toISOString(),
      triggeredBy: 'Scheduler',
    });
  });

  return store;
}
