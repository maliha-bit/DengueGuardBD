import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export interface SkeletonProps {
  shape?: 'text' | 'circle' | 'rect';
  className?: string;
}

/** Decorative shimmer block. Wrap groups in <SkeletonGroup> to announce loading. */
export function Skeleton({ shape = 'rect', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer bg-[linear-gradient(90deg,#ECECEE_25%,#F6F6F7_50%,#ECECEE_75%)] bg-[length:200%_100%]',
        shape === 'text' && 'h-3.5 w-full rounded-full',
        shape === 'circle' && 'h-9 w-9 rounded-full',
        shape === 'rect' && 'h-24 w-full rounded-2xl',
        className,
      )}
    />
  );
}

/** Container that tells screen readers content is loading. */
export function SkeletonGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')} className={className}>
      {children}
    </div>
  );
}

/** Skeleton shaped like a stat card. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <SkeletonGroup className={cn('rounded-3xl bg-white p-5', className)}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton shape="circle" />
        <Skeleton shape="text" className="w-1/3" />
      </div>
      <Skeleton shape="rect" className="h-10 w-1/2" />
      <Skeleton shape="text" className="mt-3 w-2/3" />
    </SkeletonGroup>
  );
}
