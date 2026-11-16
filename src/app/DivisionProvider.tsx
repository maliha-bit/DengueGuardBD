import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { DivisionId } from '@/api/types';
import { DivisionContext } from './division';

const STORAGE_KEY = 'dg.division';
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

function readStored(): DivisionId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (DIVISION_IDS as string[]).includes(stored)) return stored as DivisionId;
  } catch {
    // storage unavailable
  }
  return 'dhaka';
}

export function DivisionProvider({ children }: { children: ReactNode }) {
  const [divisionId, setState] = useState<DivisionId>(readStored);
  const setDivisionId = useCallback((id: DivisionId) => {
    setState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);
  const value = useMemo(() => ({ divisionId, setDivisionId }), [divisionId, setDivisionId]);
  return <DivisionContext.Provider value={value}>{children}</DivisionContext.Provider>;
}
