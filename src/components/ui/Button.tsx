import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './styles';

export type { ButtonSize, ButtonVariant };

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
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses({ variant, size, iconOnly: Boolean(IconOnly), fullWidth }),
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
