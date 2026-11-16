import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Shield with a mosquito silhouette — our own mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('h-8 w-8', className)}>
      <path
        d="M16 2.5 27 6.6v8.2c0 7.1-4.6 12.6-11 14.7C9.6 27.4 5 21.9 5 14.8V6.6L16 2.5Z"
        fill="#D9F26B"
      />
      <g stroke="#161618" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M16 11v9" />
        <path d="M16 13.5c-2.4-2.6-5-3-6.4-2.2M16 13.5c2.4-2.6 5-3 6.4-2.2" />
        <path d="M15 16.5l-3.6 2.6M17 16.5l3.6 2.6M15 18.5l-2.6 3.4M17 18.5l2.6 3.4" />
        <path d="M16 11l-1.4-2.2" />
      </g>
      <circle cx="16" cy="10.6" r="1.5" fill="#161618" />
    </svg>
  );
}

export function Logo({ onDark = true }: { onDark?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span
        className={cn(
          'text-lg font-semibold tracking-tight',
          onDark ? 'text-white' : 'text-brand-ink',
        )}
      >
        {t('common.appName')}
      </span>
    </span>
  );
}
