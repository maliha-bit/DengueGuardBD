import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { Badge, type BadgeTone } from './Badge';
import { Card, type CardTone } from './Card';

export interface StatCardProps {
  title: ReactNode;
  icon?: LucideIcon;
  value: number | string;
  unit?: ReactNode;
  delta?: { label: ReactNode; tone?: BadgeTone };
  /** Muted line under the value (e.g. "Updated 20 min ago"). */
  caption?: ReactNode;
  /** Small right-aligned block next to the value. */
  aside?: ReactNode;
  actions?: ReactNode;
  tone?: CardTone;
  className?: string;
  children?: ReactNode;
}

/** Card with a big number + small unit, e.g. "62 beds". Numbers use locale digits. */
export function StatCard({
  title,
  icon,
  value,
  unit,
  delta,
  caption,
  aside,
  actions,
  tone = 'light',
  className,
  children,
}: StatCardProps) {
  const { i18n } = useTranslation();
  const display = typeof value === 'number' ? formatNumber(value, i18n.language) : value;
  const mutedText = tone === 'dark' ? 'text-white/70' : 'text-brand-muted';
  return (
    <Card tone={tone} title={title} icon={icon} actions={actions} className={className}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-start gap-1.5">
          <span className="text-stat">{display}</span>
          <div className="flex flex-col items-start gap-1">
            {delta && <Badge tone={delta.tone ?? 'lime'}>{delta.label}</Badge>}
            {unit && <span className={cn('text-xs', mutedText)}>{unit}</span>}
          </div>
        </div>
        {aside && <div className={cn('text-right text-xs', mutedText)}>{aside}</div>}
      </div>
      {caption && <p className={cn('mt-2 text-xs', mutedText)}>{caption}</p>}
      {children}
    </Card>
  );
}
