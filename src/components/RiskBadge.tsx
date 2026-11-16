import type { RiskLevel } from '@/api/types';
import { Badge } from '@/components/ui';
import { riskMeta } from '@/lib/risk';
import { useLocale } from '@/lib/useLocale';

/** Risk level as icon + text + colour (never colour alone). */
export function RiskBadge({
  level,
  size = 'md',
  className,
}: {
  level: RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t } = useLocale();
  const meta = riskMeta(level);
  return (
    <Badge tone={meta.tone} icon={meta.icon} size={size} className={className}>
      {t(meta.labelKey)}
    </Badge>
  );
}
