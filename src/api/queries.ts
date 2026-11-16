import { useQuery } from '@tanstack/react-query';
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
