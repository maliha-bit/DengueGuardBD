import { useId, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { formatNumber, parseLocaleNumber } from '@/lib/format';

/**
 * Big − / + stepper with a typed value in the middle (Latin or Bangla digits).
 * Each button is 56px so bed counts can be updated in a couple of taps.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  unit,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  unit?: ReactNode;
  error?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const shown = Number.isFinite(value)
    ? formatNumber(value, i18n.language, { useGrouping: false })
    : '';
  const buttonClass =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-ink text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          aria-label={t('staff.stepper.decrease', { label })}
          disabled={!Number.isFinite(value) || value <= min}
          onClick={() => onChange(Math.max(min, Math.round(value) - 1))}
        >
          <Minus aria-hidden="true" className="h-6 w-6" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={shown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(parseLocaleNumber(event.target.value || 'x'))}
          className={cn(
            'h-14 w-24 min-w-0 rounded-2xl bg-brand-canvas text-center text-[2rem] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink',
            error ? 'ring-2 ring-[#C9353A]' : undefined,
          )}
        />
        <button
          type="button"
          className={buttonClass}
          aria-label={t('staff.stepper.increase', { label })}
          disabled={!Number.isFinite(value) || value >= max}
          onClick={() => onChange(Math.min(max, Math.round(value) + 1))}
        >
          <Plus aria-hidden="true" className="h-6 w-6" />
        </button>
        {unit && <span className="text-sm text-brand-muted">{unit}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-[#B3262B]">
          {error}
        </p>
      )}
    </div>
  );
}
