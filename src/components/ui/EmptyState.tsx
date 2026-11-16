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
  className?: string;
}

export function EmptyState({ icon = Inbox, title, message, action, className }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-col items-center px-4 py-8 text-center', className)}>
      <IconChip icon={icon} size="lg" tone="lavender" />
      <p className="mt-4 text-base font-medium">{title ?? t('states.emptyTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-brand-muted">
        {message ?? t('states.emptyMessage')}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
