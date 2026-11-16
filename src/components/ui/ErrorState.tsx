import type { ReactNode } from 'react';
import { CloudOff, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { IconChip } from './IconChip';

export interface ErrorStateProps {
  title?: ReactNode;
  message?: ReactNode;
  onRetry: () => void;
  retrying?: boolean;
  /** Tighter spacing for small dashboard cards. */
  compact?: boolean;
  /** Use on dark cards. */
  onDark?: boolean;
  className?: string;
}

/** Error block with a Retry button (NFR28). */
export function ErrorState({
  title,
  message,
  onRetry,
  retrying,
  compact,
  onDark,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center px-4 text-center',
        compact ? 'py-2' : 'py-8',
        className,
      )}
    >
      <IconChip icon={CloudOff} size={compact ? 'md' : 'lg'} tone={onDark ? 'onDark' : 'grey'} />
      <p className={cn('font-medium', compact ? 'mt-2 text-sm' : 'mt-4 text-base')}>
        {title ?? t('states.errorTitle')}
      </p>
      <p className={cn('mt-1 max-w-sm text-sm', onDark ? 'text-white/70' : 'text-brand-muted')}>
        {message ?? t('states.errorMessage')}
      </p>
      <Button
        className={compact ? 'mt-3' : 'mt-5'}
        variant={onDark ? 'primary' : 'secondary'}
        size="sm"
        leadingIcon={RotateCw}
        loading={retrying}
        onClick={onRetry}
      >
        {retrying ? t('common.retrying') : t('common.retry')}
      </Button>
    </div>
  );
}
