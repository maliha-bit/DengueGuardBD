import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SessionContext } from './session';

const STORAGE_KEY = 'dg.session';

function initialLoggedIn(): boolean {
  if (new URLSearchParams(window.location.search).get('as') === 'guest') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'guest';
  } catch {
    return true;
  }
}

function persist(loggedIn: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, loggedIn ? 'citizen' : 'guest');
  } catch {
    // storage unavailable
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setLoggedIn] = useState(initialLoggedIn);
  const signIn = useCallback(() => {
    setLoggedIn(true);
    persist(true);
  }, []);
  const signOut = useCallback(() => {
    setLoggedIn(false);
    persist(false);
  }, []);
  const value = useMemo(() => ({ isLoggedIn, signIn, signOut }), [isLoggedIn, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
