import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-lime text-brand-ink hover:bg-[#cde65a] active:bg-[#c3dc4f]',
  secondary: 'bg-white text-brand-ink ring-1 ring-inset ring-brand-line hover:bg-brand-canvas',
  ghost: 'bg-transparent text-current hover:bg-black/5',
  // Slightly darker than the emergency token so white text passes AA (≥4.5:1).
  danger: 'bg-[#C9353A] text-white hover:bg-[#B32E33] active:bg-[#A0282D]',
};

// Every size keeps a ≥44px touch target.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-touch px-4 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-sm gap-2',
  lg: 'min-h-14 px-6 text-base gap-2',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-11 w-11',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

interface BaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  fullWidth?: boolean;
}

interface TextButtonProps extends BaseProps {
  children: ReactNode;
  iconOnly?: undefined;
}

/** Icon-only buttons must have an accessible name. */
interface IconButtonProps extends BaseProps {
  iconOnly: LucideIcon;
  'aria-label': string;
  children?: undefined;
}

export type ButtonProps = TextButtonProps | IconButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leadingIcon: Leading,
    trailingIcon: Trailing,
    iconOnly: IconOnly,
    fullWidth,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        IconOnly ? iconSizes[size] : sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : IconOnly ? (
        <IconOnly aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      ) : (
        Leading && <Leading aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      )}
      {!IconOnly && children}
      {!IconOnly && Trailing && !loading && (
        <Trailing aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
});
