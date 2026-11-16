import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorId, hintId } from './fieldUtils';

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}

/** Label + control + hint/error wrapper shared by Input and Select. */
export function Field({ id, label, hint, error, optional, children }: FieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-brand-ink">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-brand-muted">({t('common.optional')})</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId(id)} className="text-xs text-brand-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(id)} className="text-xs font-medium text-[#B3262B]">
          {error}
        </p>
      )}
    </div>
  );
}
