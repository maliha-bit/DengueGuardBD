import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type IconChipTone = 'grey' | 'dark' | 'lime' | 'lavender' | 'onDark';

const tones: Record<IconChipTone, string> = {
  grey: 'bg-brand-canvas text-brand-ink',
  dark: 'bg-brand-ink text-white',
  lime: 'bg-brand-lime text-brand-ink',
  lavender: 'bg-brand-lavender-soft text-brand-ink',
  onDark: 'bg-white/10 text-white',
};

export interface IconChipProps {
  icon: LucideIcon;
  tone?: IconChipTone;
  /** 36px by default (design spec); "lg" is 48px for empty/error states. */
  size?: 'md' | 'lg';
  className?: string;
}

/** Decorative round icon chip used in card headers. */
export function IconChip({ icon: Icon, tone = 'grey', size = 'md', className }: IconChipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'h-9 w-9' : 'h-12 w-12',
        tones[tone],
        className,
      )}
    >
      <Icon className={size === 'md' ? 'h-[18px] w-[18px]' : 'h-6 w-6'} strokeWidth={1.75} />
    </span>
  );
}
