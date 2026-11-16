import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { useDialog } from './useDialog';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** "bottom" for the mobile "More" sheet, "right" for side panels. */
  side?: 'bottom' | 'right';
  children?: ReactNode;
}

export function Sheet({ open, onClose, title, side = 'bottom', children }: SheetProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, onClose, panelRef);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-black/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col bg-white text-brand-ink shadow-xl',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[85vh] animate-sheet-up rounded-t-3xl pb-[env(safe-area-inset-bottom)]',
          side === 'right' && 'inset-y-0 right-0 w-full max-w-sm animate-sheet-left rounded-l-3xl',
        )}
      >
        {side === 'bottom' && (
          <span aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-brand-line" />
        )}
        <div className="flex items-center gap-3 px-5 pt-3">
          <h2 id={titleId} className="flex-1 text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            iconOnly={X}
            aria-label={t('common.close')}
            onClick={onClose}
          />
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
