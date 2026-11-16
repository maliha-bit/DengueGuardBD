import { createContext, useContext } from 'react';
import type { DivisionId } from '@/api/types';

export interface DivisionContextValue {
  divisionId: DivisionId;
  setDivisionId: (id: DivisionId) => void;
}

export const DivisionContext = createContext<DivisionContextValue | null>(null);

/** The division the citizen is looking at (Dhaka by default). */
export function useDivision(): DivisionContextValue {
  const value = useContext(DivisionContext);
  if (!value) throw new Error('useDivision must be used inside <DivisionProvider>');
  return value;
}
