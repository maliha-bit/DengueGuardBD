import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { IconChip } from './IconChip';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  /** Tighter spacing for small dashboard cards. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon = Inbox,
  title,
  message,
  action,
  compact,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 text-center',
        compact ? 'py-2' : 'py-8',
        className,
      )}
    >
      <IconChip icon={icon} size={compact ? 'md' : 'lg'} tone="lavender" />
      <p className={cn('font-medium', compact ? 'mt-2 text-sm' : 'mt-4 text-base')}>
        {title ?? t('states.emptyTitle')}
      </p>
      <p className="mt-1 max-w-sm text-sm text-brand-muted">
        {message ?? t('states.emptyMessage')}
      </p>
      {action && <div className={compact ? 'mt-3' : 'mt-5'}>{action}</div>}
    </div>
  );
}
