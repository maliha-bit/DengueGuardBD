import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { EmergencySheet } from '@/features/emergency/EmergencySheet';
import { EmergencyContext } from './emergency';

/** Owns the single Emergency sheet so it works the same on every page. */
export function EmergencyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const openEmergency = useCallback(() => setOpen(true), []);
  const closeEmergency = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ isOpen, openEmergency, closeEmergency }),
    [isOpen, openEmergency, closeEmergency],
  );
  return (
    <EmergencyContext.Provider value={value}>
      {children}
      <EmergencySheet open={isOpen} onClose={closeEmergency} />
    </EmergencyContext.Provider>
  );
}
