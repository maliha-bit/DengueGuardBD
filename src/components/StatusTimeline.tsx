import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TimelineState = 'done' | 'current' | 'upcoming' | 'failed';

export interface TimelineStep {
  key: string;
  label: string;
  state: TimelineState;
  /** Already formatted (e.g. "21 Nov, 10:30"). */
  time?: string;
}

const STATE_STYLE: Record<TimelineState, string> = {
  done: 'bg-brand-ink text-white',
  current: 'bg-brand-lime text-brand-ink ring-2 ring-brand-ink',
  upcoming: 'bg-brand-canvas text-brand-muted',
  failed: 'bg-[#FBE3E4] text-[#8E1F23] ring-1 ring-[#E5484D]',
};

/**
 * Horizontal status steps (vertical on narrow cards). Each step has an icon and text, so the
 * state never depends on colour alone.
 */
export function StatusTimeline({
  steps,
  label,
  stateLabels,
}: {
  steps: TimelineStep[];
  /** Accessible name, e.g. "Request status". */
  label: string;
  /** Screen-reader words for each state ("done", "current step", …). */
  stateLabels: Record<TimelineState, string>;
}) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:gap-0">
      {steps.map((step, index) => {
        const Icon = step.state === 'failed' ? X : step.state === 'upcoming' ? Circle : Check;
        return (
          <li
            key={step.key}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 sm:flex-col sm:items-start"
          >
            <div className="flex items-center gap-2 sm:w-full">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  STATE_STYLE[step.state],
                )}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'hidden h-0.5 flex-1 rounded-full sm:block',
                    step.state === 'done' ? 'bg-brand-ink' : 'bg-brand-line',
                  )}
                />
              )}
            </div>
            <div className="min-w-0 text-xs sm:pr-2">
              <p
                className={cn(
                  'font-medium',
                  step.state === 'upcoming' && 'text-brand-muted',
                  step.state === 'failed' && 'text-[#8E1F23]',
                )}
              >
                {step.label}
                <span className="sr-only"> ({stateLabels[step.state]})</span>
              </p>
              {step.time && <p className="text-brand-muted">{step.time}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
