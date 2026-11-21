import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { TRIAGE_STEPS, type TriageStep } from './rules';

export interface QuestionStepProps {
  step: TriageStep;
  index: number;
  options: readonly string[];
  multiple: boolean;
  /** Selected option ids (one item for single-choice steps). */
  value: string[];
  onChange: (value: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  /** Label for the Next button (e.g. "See result" when a warning sign is ticked). */
  nextLabel: string;
  danger?: boolean;
}

/** One question per screen: progress bar, choices, Back and Next. */
export function QuestionStep({
  step,
  index,
  options,
  multiple,
  value,
  onChange,
  onBack,
  onNext,
  nextLabel,
  danger,
}: QuestionStepProps) {
  const { t, n } = useLocale();
  const total = TRIAGE_STEPS.length;
  const progress = Math.round(((index + 1) / total) * 100);
  const canContinue = multiple || value.length > 0;
  const legendId = `triage-${step}-legend`;

  const toggle = (option: string) => {
    if (!multiple) return onChange([option]);
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <Card>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-brand-muted">
          <span>{t('triage.progress', { current: n(index + 1), total: n(total) })}</span>
          <span>{n(progress)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={t('triage.progressLabel')}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-valuetext={t('triage.progress', { current: n(index + 1), total: n(total) })}
          className="h-2 overflow-hidden rounded-full bg-brand-canvas"
        >
          <div
            className="h-full rounded-full bg-brand-ink transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) onNext();
        }}
      >
        <fieldset aria-describedby={`${legendId}-hint`}>
          <legend id={legendId} className="text-xl font-semibold leading-snug md:text-2xl">
            {t(`triage.questions.${step}.title`)}
          </legend>
          <p id={`${legendId}-hint`} className="mt-1 text-sm text-brand-muted">
            {t(`triage.questions.${step}.hint`)}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {options.map((option) => {
              const checked = value.includes(option);
              return (
                <label
                  key={option}
                  className={cn(
                    'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ring-1 ring-inset transition-colors',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink',
                    checked
                      ? danger
                        ? 'bg-[#FBE3E4] text-[#8E1F23] ring-[#E5484D]'
                        : 'bg-brand-lime-soft ring-brand-ink'
                      : 'bg-white ring-brand-line hover:bg-brand-canvas',
                  )}
                >
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={step}
                    value={option}
                    checked={checked}
                    onChange={() => toggle(option)}
                    className="h-5 w-5 shrink-0 accent-brand-ink focus:outline-none"
                  />
                  {/* Option ids come from rules.ts; every one has a label in both locale files. */}
                  <span>
                    {t(`triage.options.${step}.${option}` as 'triage.options.ageGroup.adult')}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" leadingIcon={ArrowLeft} onClick={onBack}>
            {t('triage.back')}
          </Button>
          <Button
            type="submit"
            variant={danger && value.length > 0 ? 'danger' : 'primary'}
            trailingIcon={ArrowRight}
            disabled={!canContinue}
          >
            {nextLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
