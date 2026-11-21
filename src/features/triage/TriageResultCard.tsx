import {
  ArrowRight,
  CalendarCheck,
  HeartPulse,
  Home,
  Hospital,
  Siren,
  Stethoscope,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TriageOutcome, WarningSign } from '@/api/types';
import { useDivision } from '@/app/division';
import { useEmergency } from '@/app/emergency';
import { Button, buttonClasses, type ButtonVariant } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

type StepKey =
  | 'fluids'
  | 'paracetamol'
  | 'logDaily'
  | 'recheck'
  | 'within24h'
  | 'test'
  | 'noNsaids'
  | 'call999'
  | 'goNow';

interface OutcomeLink {
  key: 'homeCare' | 'feverLog' | 'bookDoctor' | 'appointments';
  to: string;
  icon: LucideIcon;
  variant: ButtonVariant;
}

const STYLE: Record<
  TriageOutcome,
  { icon: LucideIcon; card: string; chip: string; steps: StepKey[] }
> = {
  monitor: {
    icon: Home,
    card: 'bg-brand-lime-soft text-brand-ink',
    chip: 'bg-brand-lime text-brand-ink',
    steps: ['fluids', 'paracetamol', 'logDaily', 'recheck'],
  },
  doctor: {
    icon: Stethoscope,
    card: 'bg-brand-lavender-soft text-brand-ink',
    chip: 'bg-brand-lavender text-brand-ink',
    steps: ['within24h', 'test', 'fluids', 'noNsaids'],
  },
  emergency: {
    // Slightly darker than the emergency token so white text passes AA.
    icon: Siren,
    card: 'bg-[#C9353A] text-white',
    chip: 'bg-white text-[#B3262B]',
    steps: ['call999', 'goNow', 'noNsaids', 'fluids'],
  },
};

/** Big outcome card: icon, title, next steps and links (UC14). */
export function TriageResultCard({
  outcome,
  warningSigns,
}: {
  outcome: TriageOutcome;
  warningSigns: WarningSign[];
}) {
  const { t, n } = useLocale();
  const { divisionId } = useDivision();
  const { openEmergency } = useEmergency();
  const style = STYLE[outcome];
  const Icon = style.icon;
  const onDark = outcome === 'emergency';

  const links: OutcomeLink[] =
    outcome === 'monitor'
      ? [
          { key: 'homeCare', to: '/home-care', icon: HeartPulse, variant: 'dark' },
          { key: 'feverLog', to: '/fever-log', icon: Thermometer, variant: 'secondary' },
        ]
      : outcome === 'doctor'
        ? [
            {
              key: 'bookDoctor',
              to: `/hospitals?division=${divisionId}`,
              icon: Hospital,
              variant: 'dark',
            },
            { key: 'appointments', to: '/appointments', icon: CalendarCheck, variant: 'secondary' },
          ]
        : [];

  return (
    <section
      aria-labelledby="triage-result-title"
      className={cn('rounded-3xl p-6 md:p-8', style.card, onDark && 'on-dark')}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
            style.chip,
          )}
        >
          <Icon className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              onDark ? 'text-white/80' : 'text-brand-muted',
            )}
          >
            {t('triage.result.label')}
          </p>
          <h2 id="triage-result-title" className="text-2xl font-semibold leading-tight md:text-3xl">
            {t(`triage.result.${outcome}.title`)}
          </h2>
          <p className={cn('mt-1 text-sm', onDark ? 'text-white/90' : 'text-brand-ink/80')}>
            {t(`triage.result.${outcome}.summary`)}
          </p>
        </div>
      </div>

      {outcome === 'emergency' && warningSigns.length > 0 && (
        <div className="mt-5 rounded-2xl bg-black/15 p-4">
          <p className="text-sm font-medium">{t('triage.result.reportedSigns')}</p>
          <ul className="mt-1 list-inside list-disc text-sm text-white/90">
            {warningSigns.map((sign) => (
              <li key={sign}>{t(`triage.options.warningSigns.${sign}`)}</li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-6 text-sm font-semibold">{t('triage.result.nextSteps')}</h3>
      <ol className="mt-2 flex flex-col gap-2">
        {style.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                onDark ? 'bg-white/20' : 'bg-white',
              )}
            >
              {n(i + 1)}
            </span>
            <span className="pt-0.5">{t(`triage.steps.${step}`)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        {outcome === 'emergency' && (
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={Siren}
            aria-haspopup="dialog"
            onClick={openEmergency}
            className="text-[#8E1F23] ring-0"
          >
            {t('triage.links.emergency')}
          </Button>
        )}
        {links.map(({ key, to, icon: LinkIcon, variant }) => (
          <Link
            key={key}
            to={to}
            className={cn(buttonClasses({ variant }), variant === 'secondary' && 'ring-0')}
          >
            <LinkIcon aria-hidden="true" className="h-4 w-4" />
            {t(`triage.links.${key}`)}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}
