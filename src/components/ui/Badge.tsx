import type { ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Siren, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  'lime' | 'lavender' | 'neutral' | 'dark' | 'risk-low' | 'risk-medium' | 'risk-high' | 'emergency';

/*
 * Risk tones use a soft tint + dark text (AA contrast) with a coloured icon,
 * so risk is never shown by colour alone.
 */
const tones: Record<BadgeTone, string> = {
  lime: 'bg-brand-lime text-brand-ink',
  lavender: 'bg-brand-lavender-soft text-brand-ink',
  neutral: 'bg-brand-canvas text-brand-ink',
  dark: 'bg-brand-ink text-white',
  'risk-low': 'bg-[#E3F3EA] text-[#1F5E3B]',
  'risk-medium': 'bg-[#FCF0D6] text-[#6B4A06]',
  'risk-high': 'bg-[#FBE3E4] text-[#8E1F23]',
  emergency: 'bg-[#C9353A] text-white',
};

const iconColors: Partial<Record<BadgeTone, string>> = {
  'risk-low': 'text-brand-risk-low',
  'risk-medium': 'text-[#C98A12]',
  'risk-high': 'text-brand-risk-high',
};

const defaultIcons: Partial<Record<BadgeTone, LucideIcon>> = {
  'risk-low': ShieldCheck,
  'risk-medium': AlertTriangle,
  'risk-high': ShieldAlert,
  emergency: Siren,
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Overrides the default icon. Risk and emergency tones always show an icon. */
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}

/** Small non-interactive label, e.g. "+5%" deltas or risk levels. */
export function Badge({ tone = 'lime', icon, size = 'sm', className, children }: BadgeProps) {
  const Icon = icon ?? defaultIcons[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        tones[tone],
        className,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          data-testid="badge-icon"
          className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', iconColors[tone])}
          strokeWidth={2.25}
        />
      )}
      {children}
    </span>
  );
}
