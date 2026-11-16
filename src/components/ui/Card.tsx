import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconChip } from './IconChip';

export type CardTone = 'light' | 'dark' | 'lime' | 'lavender';

const tones: Record<CardTone, string> = {
  light: 'bg-brand-card text-brand-ink',
  dark: 'on-dark bg-brand-ink-card text-white',
  lime: 'bg-brand-lime text-brand-ink',
  lavender: 'bg-brand-lavender text-brand-ink',
};

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  tone?: CardTone;
  title?: ReactNode;
  icon?: LucideIcon;
  /** Right side of the header row (e.g. kebab menu, period select). */
  actions?: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
  children?: ReactNode;
}

/** Rounded bento card with optional header: icon chip + title + actions. */
export function Card({
  tone = 'light',
  title,
  icon,
  actions,
  titleAs: Title = 'h3',
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || icon || actions);
  return (
    <section className={cn('rounded-3xl p-5', tones[tone], className)} {...rest}>
      {hasHeader && (
        <header className="mb-4 flex items-center gap-3">
          {icon && <IconChip icon={icon} tone={tone === 'dark' ? 'onDark' : 'grey'} />}
          {title && (
            <Title className="min-w-0 flex-1 truncate text-base font-medium">{title}</Title>
          )}
          {actions && <div className="-my-2 ml-auto flex shrink-0 items-center">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
