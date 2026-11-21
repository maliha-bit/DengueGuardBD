import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { staffApi } from './staffClient';
import type {
  BedUpdateInput,
  BreedingReportStatus,
  DirectoryEditInput,
  DirectoryKind,
  KnowledgeSourceInput,
  LabListingInput,
  PreventionTaskInput,
  PreventionTaskStatus,
  SlotGeneratorInput,
  StaffDoctorInput,
  WeeklyScheduleDay,
} from './types';

export const staffKeys = {
  hospital: ['staff', 'hospital'] as const,
  doctors: ['staff', 'doctors'] as const,
  slots: ['staff', 'slots'] as const,
  appointments: ['staff', 'appointments'] as const,
  lab: ['staff', 'lab'] as const,
  reports: ['staff', 'reports'] as const,
  tasks: ['staff', 'tasks'] as const,
  signups: ['staff', 'signups'] as const,
  directory: (kind: DirectoryKind) => ['staff', 'directory', kind] as const,
  sources: ['staff', 'sources'] as const,
  jobs: ['staff', 'jobs'] as const,
  analytics: ['staff', 'analytics'] as const,
  audit: ['staff', 'audit'] as const,
};

/**
 * Mutation that refreshes the given queries (and the audit trail, since every staff action is
 * logged) once it settles.
 */
function useStaffMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  invalidate: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      Promise.all(
        [...invalidate, staffKeys.audit, staffKeys.analytics].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/* ---------- hospital staff ---------- */

export const useStaffHospital = () =>
  useQuery({ queryKey: staffKeys.hospital, queryFn: staffApi.getStaffHospital, staleTime: 0 });

/** Bed updates also refresh the citizen hospital search, detail page and dashboard card. */
export const useUpdateBeds = () =>
  useStaffMutation(
    (input: BedUpdateInput) => staffApi.updateBeds(input),
    [staffKeys.hospital, ['hospitals'], ['beds']],
  );

export const useStaffDoctors = () =>
  useQuery({ queryKey: staffKeys.doctors, queryFn: staffApi.getStaffDoctors });

export const useSaveDoctor = () =>
  useStaffMutation(
    ({ doctorId, input }: { doctorId: string | null; input: StaffDoctorInput }) =>
      staffApi.saveDoctor(doctorId, input),
    [staffKeys.doctors],
  );

export const useSetDoctorActive = () =>
  useStaffMutation(
    ({ doctorId, active }: { doctorId: string; active: boolean }) =>
      staffApi.setDoctorActive(doctorId, active),
    [staffKeys.doctors],
  );

export const useSaveSchedule = () =>
  useStaffMutation(
    ({ doctorId, schedule }: { doctorId: string; schedule: WeeklyScheduleDay[] }) =>
      staffApi.saveSchedule(doctorId, schedule),
    [staffKeys.doctors],
  );

export const usePublishedSlots = () =>
  useQuery({ queryKey: staffKeys.slots, queryFn: staffApi.getPublishedSlots });

export const usePreviewSlots = () =>
  useMutation({ mutationFn: (input: SlotGeneratorInput) => staffApi.previewSlots(input) });

export const usePublishSlots = () =>
  useStaffMutation((input: SlotGeneratorInput) => staffApi.publishSlots(input), [staffKeys.slots]);

export const useHospitalAppointments = () =>
  useQuery({
    queryKey: staffKeys.appointments,
    queryFn: staffApi.getHospitalAppointments,
    staleTime: 0,
  });

export const useSetAppointmentStatus = () =>
  useStaffMutation(
    ({ appointmentId, status }: { appointmentId: string; status: 'completed' | 'missed' }) =>
      staffApi.setAppointmentStatus(appointmentId, status),
    [staffKeys.appointments],
  );

/* ---------- lab staff ---------- */

export const useStaffLab = () =>
  useQuery({ queryKey: staffKeys.lab, queryFn: staffApi.getStaffLab, staleTime: 0 });

/** Publishing also refreshes the citizen lab search. */
export const usePublishLab = () =>
  useStaffMutation(
    (input: LabListingInput) => staffApi.publishLab(input),
    [staffKeys.lab, ['labs']],
  );

/* ---------- health authority ---------- */

export const useAuthorityReports = () =>
  useQuery({ queryKey: staffKeys.reports, queryFn: staffApi.getAuthorityReports, staleTime: 0 });

/** Status changes also refresh the citizen's "My reports" timeline. */
export const useSetReportStatus = () =>
  useStaffMutation(
    (args: { reportId: string; status: BreedingReportStatus; note: string }) =>
      staffApi.setReportStatus(args.reportId, args.status, args.note),
    [staffKeys.reports, ['me', 'breeding-reports']],
  );

export const useTasks = () =>
  useQuery({ queryKey: staffKeys.tasks, queryFn: staffApi.getTasks, staleTime: 0 });

export const useCreateTask = () =>
  useStaffMutation((input: PreventionTaskInput) => staffApi.createTask(input), [staffKeys.tasks]);

export const useMoveTask = () =>
  useStaffMutation(
    ({ taskId, status }: { taskId: string; status: PreventionTaskStatus }) =>
      staffApi.moveTask(taskId, status),
    [staffKeys.tasks],
  );

export const useLogExport = () => useStaffMutation((what: string) => staffApi.logExport(what), []);

/* ---------- administrator ---------- */

export const useSignups = () =>
  useQuery({ queryKey: staffKeys.signups, queryFn: staffApi.getSignups, staleTime: 0 });

export const useDecideSignup = () =>
  useStaffMutation(
    (args: { signupId: string; approve: boolean; reason: string }) =>
      staffApi.decideSignup(args.signupId, args.approve, args.reason),
    [staffKeys.signups],
  );

export const useDirectoryHospitals = () =>
  useQuery({ queryKey: staffKeys.directory('hospital'), queryFn: staffApi.getDirectoryHospitals });
export const useDirectoryLabs = () =>
  useQuery({ queryKey: staffKeys.directory('lab'), queryFn: staffApi.getDirectoryLabs });
export const useDirectoryUsers = () =>
  useQuery({ queryKey: staffKeys.directory('user'), queryFn: staffApi.getDirectoryUsers });
export const useDirectoryDonors = () =>
  useQuery({ queryKey: staffKeys.directory('donor'), queryFn: staffApi.getDirectoryDonors });

/** Directory changes also refresh the matching citizen lists. */
const CITIZEN_KEYS: Record<DirectoryKind, QueryKey[]> = {
  hospital: [['hospitals'], ['beds']],
  lab: [['labs']],
  user: [],
  donor: [['donors']],
};

export const useEditDirectoryItem = (kind: DirectoryKind) =>
  useStaffMutation(
    ({ id, input }: { id: string; input: DirectoryEditInput }) =>
      staffApi.editDirectoryItem(kind, id, input),
    [staffKeys.directory(kind), ...CITIZEN_KEYS[kind]],
  );

export const useSetDirectoryActive = (kind: DirectoryKind) =>
  useStaffMutation(
    ({ id, active }: { id: string; active: boolean }) =>
      staffApi.setDirectoryActive(kind, id, active),
    [staffKeys.directory(kind), ...CITIZEN_KEYS[kind]],
  );

export const useKnowledgeSources = () =>
  useQuery({ queryKey: staffKeys.sources, queryFn: staffApi.getKnowledgeSources });

export const useSaveKnowledgeSource = () =>
  useStaffMutation(
    ({ sourceId, input }: { sourceId: string | null; input: KnowledgeSourceInput }) =>
      staffApi.saveKnowledgeSource(sourceId, input),
    [staffKeys.sources],
  );

export const useRemoveKnowledgeSource = () =>
  useStaffMutation(
    (sourceId: string) => staffApi.removeKnowledgeSource(sourceId),
    [staffKeys.sources],
  );

/** Polls while a run is in progress. */
export const useForecastJobs = () =>
  useQuery({
    queryKey: staffKeys.jobs,
    queryFn: staffApi.getForecastJobs,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.status === 'running') ? 500 : false,
  });

export const useStartForecastRun = () =>
  useStaffMutation(() => staffApi.startForecastRun(), [staffKeys.jobs]);

export const useAnalytics = () =>
  useQuery({ queryKey: staffKeys.analytics, queryFn: staffApi.getAnalytics, staleTime: 0 });

export const useAuditTrail = () =>
  useQuery({ queryKey: staffKeys.audit, queryFn: staffApi.getAuditTrail, staleTime: 0 });
