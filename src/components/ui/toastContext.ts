import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null);

/** Show a short, auto-dismissing message (announced to screen readers). */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
