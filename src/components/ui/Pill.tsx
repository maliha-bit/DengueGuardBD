import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PillTone = 'light' | 'dark';

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** When set on an interactive pill, it acts as a toggle and exposes aria-pressed. */
  selected?: boolean;
  tone?: PillTone;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  /** Small lime count badge (like the active sidebar item). */
  count?: ReactNode;
  children: ReactNode;
}

/**
 * Rounded pill: date pill, filter chip, segmented option.
 * Renders a <button> when it has an onClick handler, otherwise a <span>.
 */
export function Pill({
  selected,
  tone = 'light',
  leadingIcon: Leading,
  trailingIcon: Trailing,
  count,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: PillProps) {
  const interactive = Boolean(onClick);
  const classes = cn(
    'inline-flex items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
    interactive ? 'min-h-touch' : 'min-h-9',
    tone === 'light' &&
      (selected
        ? 'bg-brand-ink text-white'
        : 'bg-white text-brand-ink ring-1 ring-inset ring-brand-line'),
    tone === 'dark' && (selected ? 'bg-white text-brand-ink' : 'bg-white/10 text-white'),
    interactive && !selected && tone === 'light' && 'hover:bg-brand-canvas',
    interactive && !selected && tone === 'dark' && 'hover:bg-white/15',
    className,
  );
  const content = (
    <>
      {Leading && <Leading aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
      <span>{children}</span>
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-lime px-1.5 text-xs font-semibold text-brand-ink">
          {count}
        </span>
      )}
      {Trailing && <Trailing aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
    </>
  );

  if (!interactive) {
    return <span className={classes}>{content}</span>;
  }
  return (
    <button type={type} aria-pressed={selected} onClick={onClick} className={classes} {...rest}>
      {content}
    </button>
  );
}
