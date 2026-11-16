import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field } from './Field';
import { controlClasses, describedBy } from './fieldUtils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  leadingIcon?: LucideIcon;
}

/** Labelled text input. Forwards its ref so it works with react-hook-form's register(). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, leadingIcon: Leading, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        {Leading && (
          <Leading
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cn(controlClasses, Leading && 'pl-10', className)}
          {...rest}
        />
      </div>
    </Field>
  );
});
