import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastOptions, type ToastTone } from './toastContext';

interface ToastItem extends Required<ToastOptions> {
  id: number;
}

const TOAST_MS = 4000;

const toneStyle: Record<ToastTone, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-brand-lime' },
  error: { icon: CircleAlert, iconClass: 'text-[#FF8A8D]' },
  info: { icon: Info, iconClass: 'text-brand-lavender' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    ({ message, tone = 'success' }: ToastOptions) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[1100] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map(({ id, message, tone }) => {
          const { icon: Icon, iconClass } = toneStyle[tone];
          return (
            <div
              key={id}
              className="on-dark pointer-events-auto flex w-full max-w-sm animate-fade-in items-center gap-3 rounded-2xl bg-brand-ink py-2 pl-4 pr-2 text-sm text-white shadow-lg"
            >
              <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', iconClass)} />
              <p className="flex-1">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label={t('common.close')}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
