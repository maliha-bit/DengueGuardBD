import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pillClasses, type PillTone } from './styles';

export type { PillTone };

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

/** Inner layout of a pill: icon, label, count, trailing icon. */
export function PillContent({
  leadingIcon: Leading,
  trailingIcon: Trailing,
  count,
  children,
}: Pick<PillProps, 'leadingIcon' | 'trailingIcon' | 'count' | 'children'>) {
  return (
    <>
      {Leading && <Leading aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />}
      <span>{children}</span>
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-lime px-1.5 text-xs font-semibold text-brand-ink">
          {count}
        </span>
      )}
      {Trailing && <Trailing aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />}
    </>
  );
}

/**
 * Rounded pill: date pill, filter chip, segmented option.
 * Renders a <button> when it has an onClick handler, otherwise a <span>.
 */
export function Pill({
  selected,
  tone = 'light',
  leadingIcon,
  trailingIcon,
  count,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: PillProps) {
  const interactive = Boolean(onClick);
  const classes = cn(pillClasses({ tone, selected, interactive }), className);
  const content = (
    <PillContent leadingIcon={leadingIcon} trailingIcon={trailingIcon} count={count}>
      {children}
    </PillContent>
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
