import { AlertTriangle, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { RiskLevel } from '@/api/types';
import { brandColors } from './tokens';

export interface RiskMeta {
  level: RiskLevel;
  /** Fill colour (always paired with icon + text, never alone). */
  color: string;
  icon: LucideIcon;
  labelKey: `risk.${RiskLevel}`;
  /** Badge tone in components/ui. */
  tone: `risk-${RiskLevel}`;
  /** Sort rank: 0 = most severe. */
  rank: number;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  high: {
    level: 'high',
    color: brandColors['risk-high'],
    icon: ShieldAlert,
    labelKey: 'risk.high',
    tone: 'risk-high',
    rank: 0,
  },
  medium: {
    level: 'medium',
    color: brandColors['risk-medium'],
    icon: AlertTriangle,
    labelKey: 'risk.medium',
    tone: 'risk-medium',
    rank: 1,
  },
  low: {
    level: 'low',
    color: brandColors['risk-low'],
    icon: ShieldCheck,
    labelKey: 'risk.low',
    tone: 'risk-low',
    rank: 2,
  },
};

/** Low → High, for legends. */
export const RISK_LEVELS_ASC: RiskLevel[] = ['low', 'medium', 'high'];

export const riskMeta = (level: RiskLevel): RiskMeta => RISK_META[level];
