import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field } from './Field';
import { controlClasses, describedBy } from './fieldUtils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  hideLabel?: boolean;
  /** "pill" = compact rounded-full control for toolbars. */
  appearance?: 'field' | 'pill';
  leadingIcon?: LucideIcon;
}

/** Native <select> (best on low-end phones) styled to match Input. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    options,
    placeholder,
    hint,
    error,
    optional,
    hideLabel,
    appearance = 'field',
    leadingIcon: Leading,
    id,
    className,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field
      id={selectId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      optional={optional}
    >
      <div className="relative">
        {Leading && (
          <Leading
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink"
          />
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error)}
          className={cn(
            controlClasses,
            'appearance-none pr-10',
            appearance === 'pill' && 'min-h-touch rounded-full font-medium ring-0',
            Leading && 'pl-10',
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted"
        />
      </div>
    </Field>
  );
});
