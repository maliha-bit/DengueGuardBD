/**
 * Typed client for the staff portals (hospital, lab, authority, admin). Same rule as
 * client.ts: VITE_USE_MOCK=true uses src/api/mock, otherwise the FastAPI backend.
 */
import { http, send, USE_MOCK } from './client';
import { staffMockApi as mock } from './mock/staffHandlers';
import type {
  Analytics,
  AuditEntry,
  AuthorityReport,
  BedAvailability,
  BedUpdateInput,
  BreedingReportStatus,
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
  SlotDraft,
  SlotGeneratorInput,
  StaffDoctor,
  StaffDoctorInput,
  StaffHospital,
  StaffSignup,
  WeeklyScheduleDay,
} from './types';

export const staffApi = {
  /* hospital staff */
  getStaffHospital: (): Promise<StaffHospital | null> =>
    USE_MOCK ? mock.getStaffHospital() : http('/staff/hospital'),
  updateBeds: (input: BedUpdateInput): Promise<BedAvailability> =>
    USE_MOCK ? mock.updateBeds(input) : send('/staff/hospital/beds', 'PUT', input),
  getStaffDoctors: (): Promise<StaffDoctor[]> =>
    USE_MOCK ? mock.getStaffDoctors() : http('/staff/hospital/doctors'),
  saveDoctor: (doctorId: string | null, input: StaffDoctorInput): Promise<StaffDoctor> =>
    USE_MOCK
      ? mock.saveDoctor(doctorId, input)
      : doctorId
        ? send(`/staff/hospital/doctors/${doctorId}`, 'PUT', input)
        : send('/staff/hospital/doctors', 'POST', input),
  setDoctorActive: (doctorId: string, active: boolean): Promise<StaffDoctor> =>
    USE_MOCK
      ? mock.setDoctorActive(doctorId, active)
      : send(`/staff/hospital/doctors/${doctorId}/active`, 'PUT', { active }),
  saveSchedule: (doctorId: string, schedule: WeeklyScheduleDay[]): Promise<StaffDoctor> =>
    USE_MOCK
      ? mock.saveSchedule(doctorId, schedule)
      : send(`/staff/hospital/doctors/${doctorId}/schedule`, 'PUT', { schedule }),
  getPublishedSlots: (): Promise<PublishedSlot[]> =>
    USE_MOCK ? mock.getPublishedSlots() : http('/staff/hospital/slots'),
  previewSlots: (
    input: SlotGeneratorInput,
  ): Promise<{ drafts: SlotDraft[]; overlaps: SlotDraft[] }> =>
    USE_MOCK ? mock.previewSlots(input) : send('/staff/hospital/slots/preview', 'POST', input),
  publishSlots: (input: SlotGeneratorInput): Promise<PublishedSlot[]> =>
    USE_MOCK ? mock.publishSlots(input) : send('/staff/hospital/slots', 'POST', input),
  getHospitalAppointments: (): Promise<HospitalAppointment[]> =>
    USE_MOCK ? mock.getHospitalAppointments() : http('/staff/hospital/appointments/today'),
  setAppointmentStatus: (
    appointmentId: string,
    status: 'completed' | 'missed',
  ): Promise<HospitalAppointment> =>
    USE_MOCK
      ? mock.setAppointmentStatus(appointmentId, status)
      : send(`/staff/hospital/appointments/${appointmentId}/status`, 'PUT', { status }),

  /* lab staff */
  getStaffLab: (): Promise<Lab | null> => (USE_MOCK ? mock.getStaffLab() : http('/staff/lab')),
  publishLab: (input: LabListingInput): Promise<Lab> =>
    USE_MOCK ? mock.publishLab(input) : send('/staff/lab', 'PUT', input),

  /* health authority */
  getAuthorityReports: (): Promise<AuthorityReport[]> =>
    USE_MOCK ? mock.getAuthorityReports() : http('/authority/breeding-reports'),
  setReportStatus: (
    reportId: string,
    status: BreedingReportStatus,
    note: string,
  ): Promise<AuthorityReport> =>
    USE_MOCK
      ? mock.setReportStatus(reportId, status, note)
      : send(`/authority/breeding-reports/${reportId}/status`, 'PUT', { status, note }),
  getTasks: (): Promise<PreventionTask[]> =>
    USE_MOCK ? mock.getTasks() : http('/authority/tasks'),
  createTask: (input: PreventionTaskInput): Promise<PreventionTask> =>
    USE_MOCK ? mock.createTask(input) : send('/authority/tasks', 'POST', input),
  moveTask: (taskId: string, status: PreventionTaskStatus): Promise<PreventionTask> =>
    USE_MOCK
      ? mock.moveTask(taskId, status)
      : send(`/authority/tasks/${taskId}/status`, 'PUT', { status }),
  logExport: (what: string): Promise<{ ok: true }> =>
    USE_MOCK ? mock.logExport(what) : send('/audit/exports', 'POST', { what }),

  /* administrator */
  getSignups: (): Promise<StaffSignup[]> => (USE_MOCK ? mock.getSignups() : http('/admin/signups')),
  decideSignup: (signupId: string, approve: boolean, reason: string): Promise<StaffSignup> =>
    USE_MOCK
      ? mock.decideSignup(signupId, approve, reason)
      : send(`/admin/signups/${signupId}/${approve ? 'approve' : 'reject'}`, 'POST', { reason }),
  getDirectoryHospitals: (): Promise<DirectoryHospital[]> =>
    USE_MOCK ? mock.getDirectoryHospitals() : http('/admin/hospitals'),
  getDirectoryLabs: (): Promise<DirectoryLab[]> =>
    USE_MOCK ? mock.getDirectoryLabs() : http('/admin/labs'),
  getDirectoryUsers: (): Promise<DirectoryUser[]> =>
    USE_MOCK ? mock.getDirectoryUsers() : http('/admin/users'),
  getDirectoryDonors: (): Promise<DirectoryDonor[]> =>
    USE_MOCK ? mock.getDirectoryDonors() : http('/admin/donors'),
  editDirectoryItem: (
    kind: DirectoryKind,
    id: string,
    input: DirectoryEditInput,
  ): Promise<{ id: string }> =>
    USE_MOCK
      ? mock.editDirectoryItem(kind, id, input)
      : send(`/admin/${kind}s/${id}`, 'PUT', input),
  setDirectoryActive: (
    kind: DirectoryKind,
    id: string,
    active: boolean,
  ): Promise<{ id: string }> =>
    USE_MOCK
      ? mock.setDirectoryActive(kind, id, active)
      : send(`/admin/${kind}s/${id}/active`, 'PUT', { active }),
  getKnowledgeSources: (): Promise<KnowledgeSource[]> =>
    USE_MOCK ? mock.getKnowledgeSources() : http('/admin/knowledge-sources'),
  saveKnowledgeSource: (
    sourceId: string | null,
    input: KnowledgeSourceInput,
  ): Promise<KnowledgeSource> =>
    USE_MOCK
      ? mock.saveKnowledgeSource(sourceId, input)
      : sourceId
        ? send(`/admin/knowledge-sources/${sourceId}`, 'PUT', input)
        : send('/admin/knowledge-sources', 'POST', input),
  removeKnowledgeSource: (sourceId: string): Promise<{ sourceId: string }> =>
    USE_MOCK
      ? mock.removeKnowledgeSource(sourceId)
      : send(`/admin/knowledge-sources/${sourceId}`, 'DELETE'),
  getForecastJobs: (): Promise<ForecastJob[]> =>
    USE_MOCK ? mock.getForecastJobs() : http('/admin/forecast/runs'),
  startForecastRun: (): Promise<ForecastJob> =>
    USE_MOCK ? mock.startForecastRun() : send('/admin/forecast/runs', 'POST'),
  getAnalytics: (): Promise<Analytics | null> =>
    USE_MOCK ? mock.getAnalytics() : http('/admin/analytics'),
  getAuditTrail: (): Promise<AuditEntry[]> =>
    USE_MOCK ? mock.getAuditTrail() : http('/admin/audit'),
};
