import { useCallback, useMemo, useState } from 'react';
import { useChecklist, useSaveChecklist } from '@/api/queries';
import { useSession } from '@/app/session';

export const GUEST_CHECKLIST_KEY = 'dg.checklist.guest';

function readGuest(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_CHECKLIST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeGuest(checked: string[]) {
  try {
    localStorage.setItem(GUEST_CHECKLIST_KEY, JSON.stringify(checked));
  } catch {
    // storage unavailable (private mode): ticks last for this visit only
  }
}

/**
 * Prevention-checklist ticks: saved to the user's account when logged in,
 * or on this device (localStorage) for guests.
 */
export function usePreventionChecklist() {
  const { isLoggedIn } = useSession();
  const query = useChecklist(isLoggedIn);
  const { mutate: saveChecklist, isError: saveFailed } = useSaveChecklist();
  const [guestChecked, setGuestChecked] = useState<string[]>(readGuest);

  const accountChecked = query.data?.checked;
  const checked = useMemo(
    () => (isLoggedIn ? (accountChecked ?? []) : guestChecked),
    [isLoggedIn, accountChecked, guestChecked],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id];
      if (isLoggedIn) {
        saveChecklist(next);
      } else {
        setGuestChecked(next);
        writeGuest(next);
      }
    },
    [checked, isLoggedIn, saveChecklist],
  );

  return { isLoggedIn, query, checked, toggle, saveFailed };
}
