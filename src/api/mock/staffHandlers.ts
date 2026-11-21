/**
 * Mock implementations of the planned staff-portal endpoints (SIMULATED data).
 * Each call checks the demo user's role and approval like the backend will, and every change
 * is written to the audit trail by the staff store.
 */
import { portalAccess } from '@/lib/access';
import { toIsoDate } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import type {
  Analytics,
  AuditEntry,
  AuthorityReport,
  BedAvailability,
  BedUpdateInput,
  BreedingReport,
  BreedingReportStatus,
  DailyCount,
  DirectoryDonor,
  DirectoryEditInput,
  DirectoryHospital,
  DirectoryKind,
  DirectoryLab,
  DirectoryUser,
  ForecastJob,
  HospitalAppointment,
  KnowledgeSource,
  KnowledgeSourceInput,
  Lab,
  LabListingInput,
  PreventionTask,
  PreventionTaskInput,
  PreventionTaskStatus,
  PublishedSlot,
  Role,
  SlotDraft,
  SlotGeneratorInput,
  StaffDoctor,
  StaffDoctorInput,
  StaffHospital,
  StaffSignup,
  WeeklyScheduleDay,
} from '../types';
import { currentBeds, mockCommunityStore, mockStaffStore } from './handlers';
import { mutate, respond } from './runtime';
import { currentUser, divisions, hashString, hospitals, labs, seededRandom } from './seed';
import {
  StaffError,
  STAFF_HOSPITAL_ID,
  STAFF_LAB_ID,
  weeklyHoursFrom,
  type Actor,
} from './staffStore';

const ROLE_HOSPITAL: Role[] = ['hospital_staff'];
const ROLE_LAB: Role[] = ['lab_staff'];
const ROLE_AUTHORITY: Role[] = ['authority'];
const ROLE_ADMIN: Role[] = ['admin'];

/** Same rule as the RequireRole guard: right role and approved. */
function actorFor(roles: Role[]): Actor {
  const staff = mockStaffStore();
  const access = portalAccess(
    { role: currentUser.role, approvalStatus: staff.approvalOf(currentUser.userId) },
    true,
    roles,
  );
  if (access !== 'granted') throw new StaffError('FORBIDDEN');
  return { name: currentUser.name, role: currentUser.role, userId: currentUser.userId };
}

const myHospitalId = () => currentUser.organisationId ?? STAFF_HOSPITAL_ID;
const myLabId = () => currentUser.organisationId ?? STAFF_LAB_ID;

function staffHospital(): StaffHospital {
  const hospitalId = myHospitalId();
  const base = hospitals.find((h) => h.hospitalId === hospitalId);
  const beds = currentBeds(new Date()).find((b) => b.hospitalId === hospitalId);
  if (!base || !beds) throw new StaffError('NOT_FOUND');
  return { hospital: mockStaffStore().applyHospital(base), beds };
}

const allDistricts = divisions.flatMap((div) =>
  div.districts.map((d) => ({ divisionId: div.divisionId, district: d })),
);

/** The district whose town is nearest to the report pin. */
function withArea(report: BreedingReport): AuthorityReport {
  let best = allDistricts[0];
  let bestKm = Infinity;
  for (const item of allDistricts) {
    const km = distanceKm(report.location, item.district.center);
    if (km < bestKm) {
      best = item;
      bestKm = km;
    }
  }
  return {
    ...report,
    divisionId: best?.divisionId ?? 'dhaka',
    districtId: best?.district.districtId ?? 'dhaka',
    district: best?.district.name ?? { en: 'Dhaka', bn: 'ঢাকা' },
  };
}

function lastDays(count: number, seed: number, base: number, spread: number): DailyCount[] {
  const rand = seededRandom(seed);
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (count - 1 - i));
    return { date: toIsoDate(d), count: Math.round(base + rand() * spread + i * (spread / 10)) };
  });
}

function analytics(): Analytics {
  const staff = mockStaffStore();
  const roles: Role[] = ['citizen', 'donor', 'hospital_staff', 'lab_staff', 'authority', 'admin'];
  const users = staff.listUsers();
  const reports = mockCommunityStore().allReports();
  const statuses: BreedingReportStatus[] = [
    'submitted',
    'under_review',
    'action_taken',
    'rejected',
  ];
  const today = toIsoDate(new Date());
  const seed = hashString(today);
  return {
    usersByRole: roles.map((role) => ({
      role,
      count: users.filter((u) => u.role === role).length,
    })),
    appointmentsPerDay: lastDays(7, seed, 30, 25),
    reportsByStatus: statuses.map((status) => ({
      status,
      count: reports.filter((r) => r.status === status).length,
    })),
    chatQuestionsPerDay: lastDays(7, seed + 1, 80, 60),
    redFlagAlertsPerDay: lastDays(7, seed + 2, 2, 6),
  };
}

export const staffMockApi = {
  /* ---------- hospital staff ---------- */

  getStaffHospital: () =>
    respond<StaffHospital | null>(() => {
      actorFor(ROLE_HOSPITAL);
      return staffHospital();
    }, null),

  updateBeds: (input: BedUpdateInput) =>
    mutate<BedAvailability>(() => {
      const actor = actorFor(ROLE_HOSPITAL);
      return mockStaffStore().updateBeds(actor, staffHospital().beds, input);
    }),

  getStaffDoctors: () =>
    respond<StaffDoctor[]>(() => {
      actorFor(ROLE_HOSPITAL);
      return mockStaffStore().doctorsOf(myHospitalId());
    }, []),

  saveDoctor: (doctorId: string | null, input: StaffDoctorInput) =>
    mutate<StaffDoctor>(() => {
      const actor = actorFor(ROLE_HOSPITAL);
      const staff = mockStaffStore();
      return doctorId
        ? staff.editDoctor(actor, doctorId, input)
        : staff.addDoctor(actor, myHospitalId(), input);
    }),

  setDoctorActive: (doctorId: string, active: boolean) =>
    mutate<StaffDoctor>(() =>
      mockStaffStore().setDoctorActive(actorFor(ROLE_HOSPITAL), doctorId, active),
    ),

  saveSchedule: (doctorId: string, schedule: WeeklyScheduleDay[]) =>
    mutate<StaffDoctor>(() =>
      mockStaffStore().saveSchedule(actorFor(ROLE_HOSPITAL), doctorId, schedule),
    ),

  getPublishedSlots: () =>
    respond<PublishedSlot[]>(() => {
      actorFor(ROLE_HOSPITAL);
      return mockStaffStore().slotsOf(myHospitalId());
    }, []),

  previewSlots: (input: SlotGeneratorInput) =>
    mutate<{ drafts: SlotDraft[]; overlaps: SlotDraft[] }>(() => {
      actorFor(ROLE_HOSPITAL);
      return mockStaffStore().previewSlots(input);
    }),

  publishSlots: (input: SlotGeneratorInput) =>
    mutate<PublishedSlot[]>(() => mockStaffStore().publishSlots(actorFor(ROLE_HOSPITAL), input)),

  getHospitalAppointments: () =>
    respond<HospitalAppointment[]>(() => {
      actorFor(ROLE_HOSPITAL);
      return mockStaffStore().appointmentsOn(myHospitalId(), toIsoDate(new Date()));
    }, []),

  setAppointmentStatus: (appointmentId: string, status: 'completed' | 'missed') =>
    mutate<HospitalAppointment>(() =>
      mockStaffStore().setAppointmentStatus(actorFor(ROLE_HOSPITAL), appointmentId, status),
    ),

  /* ---------- lab staff ---------- */

  getStaffLab: () =>
    respond<Lab | null>(() => {
      actorFor(ROLE_LAB);
      const lab = mockStaffStore().getLab(myLabId());
      return { ...lab, weeklyHours: weeklyHoursFrom(lab) };
    }, null),

  publishLab: (input: LabListingInput) =>
    mutate<Lab>(() => mockStaffStore().publishLab(actorFor(ROLE_LAB), myLabId(), input)),

  /* ---------- health authority ---------- */

  getAuthorityReports: () =>
    respond<AuthorityReport[]>(() => {
      actorFor(ROLE_AUTHORITY);
      return mockCommunityStore().allReports().map(withArea);
    }, []),

  setReportStatus: (reportId: string, status: BreedingReportStatus, note: string) =>
    mutate<AuthorityReport>(() => {
      const actor = actorFor(ROLE_AUTHORITY);
      const report = mockCommunityStore().setReportStatus(reportId, status, note);
      mockStaffStore().log(actor, 'report_status', {
        en: `${report.reference} → ${status}`,
        bn: `${report.reference} → ${status}`,
      });
      return withArea(report);
    }),

  getTasks: () =>
    respond<PreventionTask[]>(() => {
      actorFor(ROLE_AUTHORITY);
      return mockStaffStore().listTasks();
    }, []),

  createTask: (input: PreventionTaskInput) =>
    mutate<PreventionTask>(() => mockStaffStore().createTask(actorFor(ROLE_AUTHORITY), input)),

  moveTask: (taskId: string, status: PreventionTaskStatus) =>
    mutate<PreventionTask>(() =>
      mockStaffStore().moveTask(actorFor(ROLE_AUTHORITY), taskId, status),
    ),

  /** Records a CSV export in the audit trail. */
  logExport: (what: string) =>
    mutate<{ ok: true }>(() => {
      const actor = actorFor([...ROLE_AUTHORITY, ...ROLE_ADMIN]);
      mockStaffStore().log(actor, 'export_csv', { en: what, bn: what });
      return { ok: true };
    }),

  /* ---------- administrator ---------- */

  getSignups: () =>
    respond<StaffSignup[]>(() => {
      actorFor(ROLE_ADMIN);
      return mockStaffStore().listSignups();
    }, []),

  decideSignup: (signupId: string, approve: boolean, reason: string) =>
    mutate<StaffSignup>(() =>
      mockStaffStore().decideSignup(actorFor(ROLE_ADMIN), signupId, approve, reason),
    ),

  getDirectoryHospitals: () =>
    respond<DirectoryHospital[]>(() => {
      actorFor(ROLE_ADMIN);
      const staff = mockStaffStore();
      return hospitals.map((h) => ({
        hospital: staff.applyHospital(h),
        active: staff.isHospitalActive(h.hospitalId),
      }));
    }, []),

  getDirectoryLabs: () =>
    respond<DirectoryLab[]>(() => {
      actorFor(ROLE_ADMIN);
      const staff = mockStaffStore();
      return labs.map((l) => ({ lab: staff.getLab(l.labId), active: staff.isLabActive(l.labId) }));
    }, []),

  getDirectoryUsers: () =>
    respond<DirectoryUser[]>(() => {
      actorFor(ROLE_ADMIN);
      return mockStaffStore().listUsers();
    }, []),

  getDirectoryDonors: () =>
    respond<DirectoryDonor[]>(() => {
      actorFor(ROLE_ADMIN);
      const staff = mockStaffStore();
      return mockCommunityStore()
        .allDonors()
        .map((donor) => ({ donor, active: staff.isDonorActive(donor.donorId) }));
    }, []),

  editDirectoryItem: (kind: DirectoryKind, id: string, input: DirectoryEditInput) =>
    mutate<{ id: string }>(() => {
      const actor = actorFor(ROLE_ADMIN);
      const staff = mockStaffStore();
      if (kind === 'hospital') staff.editHospital(actor, id, input);
      else if (kind === 'lab') staff.editLab(actor, id, input);
      else if (kind === 'user') staff.editUser(actor, id, input);
      else {
        const name = { en: input.name.trim(), bn: input.nameBn.trim() };
        mockCommunityStore().updateDonor(id, name, input.phone.trim());
        staff.log(actor, 'donor_update', name);
      }
      return { id };
    }),

  setDirectoryActive: (kind: DirectoryKind, id: string, active: boolean) =>
    mutate<{ id: string }>(() => {
      const actor = actorFor(ROLE_ADMIN);
      const staff = mockStaffStore();
      if (kind === 'hospital') staff.setHospitalActive(actor, id, active);
      else if (kind === 'lab') staff.setLabActive(actor, id, active);
      else if (kind === 'user') staff.setUserActive(actor, id, active);
      else {
        const donor = mockCommunityStore()
          .allDonors()
          .find((d) => d.donorId === id);
        if (!donor) throw new StaffError('NOT_FOUND');
        staff.setDonorActive(actor, id, donor.name, active);
      }
      return { id };
    }),

  getKnowledgeSources: () =>
    respond<KnowledgeSource[]>(() => {
      actorFor(ROLE_ADMIN);
      return mockStaffStore().listSources();
    }, []),

  saveKnowledgeSource: (sourceId: string | null, input: KnowledgeSourceInput) =>
    mutate<KnowledgeSource>(() =>
      mockStaffStore().saveSource(actorFor(ROLE_ADMIN), sourceId, input),
    ),

  removeKnowledgeSource: (sourceId: string) =>
    mutate<{ sourceId: string }>(() => {
      mockStaffStore().removeSource(actorFor(ROLE_ADMIN), sourceId);
      return { sourceId };
    }),

  getForecastJobs: () =>
    respond<ForecastJob[]>(() => {
      actorFor(ROLE_ADMIN);
      return mockStaffStore().listJobs(5);
    }, []),

  startForecastRun: () =>
    mutate<ForecastJob>(() => mockStaffStore().startForecastRun(actorFor(ROLE_ADMIN))),

  getAnalytics: () =>
    respond<Analytics | null>(() => {
      actorFor(ROLE_ADMIN);
      return analytics();
    }, null),

  getAuditTrail: () =>
    respond<AuditEntry[]>(() => {
      actorFor(ROLE_ADMIN);
      return mockStaffStore().listAudit();
    }, []),
};
