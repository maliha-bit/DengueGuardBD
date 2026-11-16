import { createContext, useContext } from 'react';

/**
 * Mock session until the auth phase. The demo user starts logged in;
 * add `?as=guest` to the URL to start as a guest.
 */
export interface SessionValue {
  isLoggedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
