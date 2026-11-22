import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/** True while the browser reports a network connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange);
      window.addEventListener('offline', onChange);
      return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** The browser's install prompt event (Chromium only; not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  // Captured as early as possible: the event fires once, often before React mounts.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** "Install app" support: `canInstall` is true only where the browser offers it. */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(deferred !== null);
  useEffect(() => {
    const update = () => setCanInstall(deferred !== null);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  const install = useCallback(async () => {
    if (!deferred) return false;
    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    notify();
    return outcome === 'accepted';
  }, []);
  return { canInstall, install };
}
