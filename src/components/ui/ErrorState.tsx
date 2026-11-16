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
  className?: string;
}

/** Error block with a Retry button (NFR28). */
export function ErrorState({ title, message, onRetry, retrying, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn('flex flex-col items-center px-4 py-8 text-center', className)}>
      <IconChip icon={CloudOff} size="lg" />
      <p className="mt-4 text-base font-medium">{title ?? t('states.errorTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-brand-muted">
        {message ?? t('states.errorMessage')}
      </p>
      <Button
        className="mt-5"
        variant="secondary"
        leadingIcon={RotateCw}
        loading={retrying}
        onClick={onRetry}
      >
        {retrying ? t('common.retrying') : t('common.retry')}
      </Button>
    </div>
  );
}
