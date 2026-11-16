import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-lime text-brand-ink hover:bg-[#cde65a] active:bg-[#c3dc4f]',
  secondary: 'bg-white text-brand-ink ring-1 ring-inset ring-brand-line hover:bg-brand-canvas',
  ghost: 'bg-transparent text-current hover:bg-black/5',
  dark: 'bg-brand-ink text-white hover:bg-black',
  // Slightly darker than the emergency token so white text passes AA (≥4.5:1).
  danger: 'bg-[#C9353A] text-white hover:bg-[#B32E33] active:bg-[#A0282D]',
};

// Every size keeps a ≥44px touch target.
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-touch px-4 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-sm gap-2',
  lg: 'min-h-14 px-6 text-base gap-2',
};

const iconButtonSizes: Record<ButtonSize, string> = {
  sm: 'h-11 w-11',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

/** Button look, shared by <Button> and links that should look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  fullWidth?: boolean;
} = {}) {
  return cn(
    'inline-flex select-none items-center justify-center rounded-full font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    buttonVariants[variant],
    iconOnly ? iconButtonSizes[size] : buttonSizes[size],
    fullWidth && 'w-full',
  );
}

export type PillTone = 'light' | 'dark';

/** Pill look, shared by <Pill> and pill-shaped links. */
export function pillClasses({
  tone = 'light',
  selected = false,
  interactive = true,
}: {
  tone?: PillTone;
  selected?: boolean;
  interactive?: boolean;
} = {}) {
  return cn(
    'inline-flex items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
    interactive ? 'min-h-touch' : 'min-h-9',
    tone === 'light' &&
      (selected
        ? 'bg-brand-ink text-white'
        : 'bg-white text-brand-ink ring-1 ring-inset ring-brand-line'),
    tone === 'dark' && (selected ? 'bg-white text-brand-ink' : 'bg-white/10 text-white'),
    interactive && !selected && tone === 'light' && 'hover:bg-brand-canvas',
    interactive && !selected && tone === 'dark' && 'hover:bg-white/15',
  );
}
