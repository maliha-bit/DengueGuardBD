import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { DivisionId, TrendPeriod } from './types';

export const queryKeys = {
  divisions: ['divisions'] as const,
  me: ['me'] as const,
  forecast: ['forecast', 'latest'] as const,
  beds: (divisionId: DivisionId) => ['beds', 'summary', divisionId] as const,
  nextAppointment: ['appointments', 'next'] as const,
  notifications: ['notifications'] as const,
  caseTrend: (divisionId: DivisionId, period: TrendPeriod) =>
    ['cases', divisionId, period] as const,
  preventionTip: ['prevention', 'tip'] as const,
  drivers: (divisionId: DivisionId) => ['drivers', divisionId] as const,
  hospitals: ['hospitals'] as const,
  hospital: (hospitalId: string) => ['hospitals', hospitalId] as const,
  doctors: (hospitalId: string) => ['doctors', hospitalId] as const,
  slots: (doctorId: string, isoDate: string) => ['slots', doctorId, isoDate] as const,
  appointments: ['appointments'] as const,
};

export const useDivisions = () =>
  useQuery({ queryKey: queryKeys.divisions, queryFn: api.getDivisions, staleTime: Infinity });

export const useCurrentUser = () =>
  useQuery({ queryKey: queryKeys.me, queryFn: api.getCurrentUser });

export const useLatestForecast = () =>
  useQuery({ queryKey: queryKeys.forecast, queryFn: api.getLatestForecast });

export const useBedSummary = (divisionId: DivisionId) =>
  useQuery({ queryKey: queryKeys.beds(divisionId), queryFn: () => api.getBedSummary(divisionId) });

export const useNextAppointment = () =>
  useQuery({ queryKey: queryKeys.nextAppointment, queryFn: api.getNextAppointment });

export const useNotifications = () =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: api.getNotifications });

export const useCaseTrend = (divisionId: DivisionId, period: TrendPeriod) =>
  useQuery({
    queryKey: queryKeys.caseTrend(divisionId, period),
    queryFn: () => api.getCaseTrend(divisionId, period),
  });

export const usePreventionTip = () =>
  useQuery({ queryKey: queryKeys.preventionTip, queryFn: api.getPreventionTip });

export const useDivisionDrivers = (divisionId: DivisionId | null) =>
  useQuery({
    queryKey: queryKeys.drivers(divisionId ?? 'dhaka'),
    queryFn: () => api.getDivisionDrivers(divisionId ?? 'dhaka'),
    enabled: divisionId !== null,
  });

/** Turn risk alerts for a division on or off; updates the cached user. */
export function useAlertSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ divisionId, enabled }: { divisionId: DivisionId; enabled: boolean }) =>
      api.setAlertSubscription(divisionId, enabled),
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}

export const useHospitals = () =>
  useQuery({ queryKey: queryKeys.hospitals, queryFn: api.getHospitals });

export const useHospital = (hospitalId: string) =>
  useQuery({
    queryKey: queryKeys.hospital(hospitalId),
    queryFn: () => api.getHospital(hospitalId),
  });

export const useDoctors = (hospitalId: string) =>
  useQuery({ queryKey: queryKeys.doctors(hospitalId), queryFn: () => api.getDoctors(hospitalId) });

/** Live slot places — always refetched so remaining places stay current. */
export const useSlots = (doctorId: string | null, isoDate: string | null) =>
  useQuery({
    queryKey: queryKeys.slots(doctorId ?? '', isoDate ?? ''),
    queryFn: () => api.getSlots(doctorId ?? '', isoDate ?? ''),
    enabled: Boolean(doctorId && isoDate),
    staleTime: 0,
  });

/** All of the user's appointments (upcoming and past). Includes the dashboard "next" query key. */
export const useAppointments = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.appointments,
    queryFn: api.getAppointments,
    enabled,
    staleTime: 0,
  });

/** After any booking change: refresh appointments (incl. dashboard card) and slot places. */
function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments }),
      queryClient.invalidateQueries({ queryKey: ['slots'] }),
    ]);
}

export function useBookAppointment() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ slotId, patientName }: { slotId: string; patientName: string }) =>
      api.bookAppointment(slotId, patientName),
    onSettled: invalidate,
  });
}

export function useCancelAppointment() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (appointmentId: string) => api.cancelAppointment(appointmentId),
    onSettled: invalidate,
  });
}

export function useRescheduleAppointment() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ appointmentId, slotId }: { appointmentId: string; slotId: string }) =>
      api.rescheduleAppointment(appointmentId, slotId),
    onSettled: invalidate,
  });
}
