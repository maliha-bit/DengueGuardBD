import { createContext, useContext } from 'react';

export interface EmergencyContextValue {
  isOpen: boolean;
  openEmergency: () => void;
  closeEmergency: () => void;
}

export const EmergencyContext = createContext<EmergencyContextValue | null>(null);

/** Opens the app-wide Emergency sheet (floating button, sidebar card, triage result). */
export function useEmergency(): EmergencyContextValue {
  const value = useContext(EmergencyContext);
  if (!value) throw new Error('useEmergency must be used inside <EmergencyProvider>');
  return value;
}
