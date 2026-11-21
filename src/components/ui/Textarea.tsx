import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Field } from './Field';
import { controlClasses, describedBy } from './fieldUtils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}

/** Labelled multi-line input; forwards its ref for react-hook-form. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, optional, id, className, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={cn(controlClasses, 'py-3', className)}
        {...rest}
      />
    </Field>
  );
});
