import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { Badge, type BadgeTone } from './Badge';
import { Card, type CardTone } from './Card';

export interface StatValueProps {
  value: number | string;
  unit?: ReactNode;
  delta?: { label: ReactNode; tone?: BadgeTone };
  /** Small right-aligned block next to the value. */
  aside?: ReactNode;
  onDark?: boolean;
  className?: string;
}

/** Big number + small unit, e.g. "62 beds". Numbers use locale digits. */
export function StatValue({ value, unit, delta, aside, onDark, className }: StatValueProps) {
  const { i18n } = useTranslation();
  const display = typeof value === 'number' ? formatNumber(value, i18n.language) : value;
  const mutedText = onDark ? 'text-white/70' : 'text-brand-muted';
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-1.5">
        <span className="text-stat">{display}</span>
        <div className="flex min-w-0 flex-col items-start gap-1 pt-1">
          {delta && <Badge tone={delta.tone ?? 'lime'}>{delta.label}</Badge>}
          {unit && <span className={cn('text-xs leading-tight', mutedText)}>{unit}</span>}
        </div>
      </div>
      {aside && <div className={cn('shrink-0 text-right text-xs', mutedText)}>{aside}</div>}
    </div>
  );
}

export interface StatCardProps extends StatValueProps {
  title: ReactNode;
  icon?: LucideIcon;
  /** Muted line under the value (e.g. "Updated 20 min ago"). */
  caption?: ReactNode;
  actions?: ReactNode;
  tone?: CardTone;
  children?: ReactNode;
}

/** Card with a StatValue. */
export function StatCard({
  title,
  icon,
  caption,
  actions,
  tone = 'light',
  className,
  children,
  ...valueProps
}: StatCardProps) {
  return (
    <Card tone={tone} title={title} icon={icon} actions={actions} className={className}>
      <StatValue {...valueProps} onDark={tone === 'dark'} />
      {caption && (
        <p className={cn('mt-2 text-xs', tone === 'dark' ? 'text-white/70' : 'text-brand-muted')}>
          {caption}
        </p>
      )}
      {children}
    </Card>
  );
}
