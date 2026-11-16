import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { Trend } from '@/features/risk/riskUtils';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

const ICONS: Record<Trend, LucideIcon> = {
  rising: ArrowUpRight,
  falling: ArrowDownRight,
  stable: ArrowRight,
};

/** Arrow + text for a 7-day trend. */
export function TrendIndicator({ trend, className }: { trend: Trend; className?: string }) {
  const { t } = useLocale();
  const Icon = ICONS[trend];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium',
        trend === 'rising' && 'bg-brand-lavender-soft text-brand-ink',
        trend === 'falling' && 'bg-brand-lime-soft text-brand-ink',
        trend === 'stable' && 'bg-brand-canvas text-brand-ink',
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
      {t(`riskMap.trend.${trend}`)}
    </span>
  );
}
