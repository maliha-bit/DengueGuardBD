import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Non-diagnostic notice (NFR08). */
export function Disclaimer({
  className,
  short = false,
}: {
  className?: string;
  /** Short form for dashboards: "Not a diagnosis. Follow DGHS guidance." */
  short?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <p className={cn('flex items-start gap-2 text-xs text-brand-muted', className)}>
      <Info aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
      <span>{short ? t('common.disclaimerShort') : t('common.disclaimer')}</span>
    </p>
  );
}
