import { useEffect, useRef, useState } from 'react';
import { History, Info, RotateCcw, ShieldCheck } from 'lucide-react';
import { useLastTriageResult, useSaveTriageResult } from '@/api/queries';
import type { TriageAnswers, TriageOutcome } from '@/api/types';
import { useEmergency } from '@/app/emergency';
import { useSession } from '@/app/session';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Badge, Button, Card, IconChip, Skeleton, SkeletonGroup } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { QuestionStep } from './QuestionStep';
import {
  AGE_GROUPS,
  EMPTY_ANSWERS,
  evaluateTriage,
  FEVER_DAYS,
  isEmergency,
  RISK_FACTORS,
  SYMPTOMS,
  TRIAGE_STEPS,
  WARNING_SIGNS,
  type TriageStep,
} from './rules';
import { TriageResultCard } from './TriageResultCard';

const STEP_OPTIONS: Record<TriageStep, readonly string[]> = {
  ageGroup: AGE_GROUPS,
  feverDays: FEVER_DAYS,
  symptoms: SYMPTOMS,
  warningSigns: WARNING_SIGNS,
  riskFactors: RISK_FACTORS,
};

const MULTIPLE: Record<TriageStep, boolean> = {
  ageGroup: false,
  feverDays: false,
  symptoms: true,
  warningSigns: true,
  riskFactors: true,
};

type Phase = { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'result' };

function readStep(answers: Partial<TriageAnswers>, step: TriageStep): string[] {
  const value = answers[step];
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function writeStep(
  answers: Partial<TriageAnswers>,
  step: TriageStep,
  value: string[],
): Partial<TriageAnswers> {
  // Option ids come from the step's own option list, so the casts below are safe.
  switch (step) {
    case 'ageGroup':
      return { ...answers, ageGroup: value[0] as TriageAnswers['ageGroup'] };
    case 'feverDays':
      return { ...answers, feverDays: value[0] as TriageAnswers['feverDays'] };
    case 'symptoms':
      return { ...answers, symptoms: value as TriageAnswers['symptoms'] };
    case 'warningSigns':
      return { ...answers, warningSigns: value as TriageAnswers['warningSigns'] };
    case 'riskFactors':
      return { ...answers, riskFactors: value as TriageAnswers['riskFactors'] };
  }
}

/** Fill unanswered steps (when a warning sign ends the checker early). */
function completeAnswers(answers: Partial<TriageAnswers>): TriageAnswers {
  return {
    ageGroup: answers.ageGroup ?? 'adult',
    feverDays: answers.feverDays ?? 'none',
    symptoms: answers.symptoms ?? [],
    warningSigns: answers.warningSigns ?? [],
    riskFactors: answers.riskFactors ?? [],
  };
}

/** Rule-based symptom checker (UC14). Public; results are saved only for logged-in users. */
export default function SymptomCheckerPage() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<Partial<TriageAnswers>>(EMPTY_ANSWERS);
  const [result, setResult] = useState<{ outcome: TriageOutcome; answers: TriageAnswers } | null>(
    null,
  );
  const headingRef = useRef<HTMLDivElement>(null);

  // Move focus to the new screen so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (phase.kind !== 'intro') headingRef.current?.focus();
  }, [phase]);

  const finish = (final: Partial<TriageAnswers>) => {
    const complete = completeAnswers(final);
    setResult({ outcome: evaluateTriage(complete).outcome, answers: complete });
    setPhase({ kind: 'result' });
  };

  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setResult(null);
    setPhase({ kind: 'intro' });
  };

  return (
    <>
      <PageHeader title={t('triage.title')} subtitle={t('triage.subtitle')} />
      <div ref={headingRef} tabIndex={-1} className="mx-auto max-w-3xl focus:outline-none">
        {phase.kind === 'intro' && (
          <TriageIntro onStart={() => setPhase({ kind: 'question', index: 0 })} />
        )}

        {phase.kind === 'question' &&
          (() => {
            const step = TRIAGE_STEPS[phase.index] ?? 'ageGroup';
            const value = readStep(answers, step);
            const emergencyNow = step === 'warningSigns' && isEmergency(answers.warningSigns ?? []);
            const isLast = phase.index === TRIAGE_STEPS.length - 1;
            return (
              <QuestionStep
                key={step}
                step={step}
                index={phase.index}
                options={STEP_OPTIONS[step]}
                multiple={MULTIPLE[step]}
                value={value}
                danger={step === 'warningSigns'}
                onChange={(next) => setAnswers((prev) => writeStep(prev, step, next))}
                onBack={() =>
                  setPhase(
                    phase.index === 0
                      ? { kind: 'intro' }
                      : { kind: 'question', index: phase.index - 1 },
                  )
                }
                onNext={() => {
                  if (emergencyNow || isLast) finish(answers);
                  else setPhase({ kind: 'question', index: phase.index + 1 });
                }}
                nextLabel={
                  emergencyNow || isLast
                    ? t('triage.seeResult')
                    : MULTIPLE[step] && value.length === 0
                      ? t('triage.noneNext')
                      : t('triage.next')
                }
              />
            );
          })()}

        {phase.kind === 'result' && result && (
          <TriageResult outcome={result.outcome} answers={result.answers} onRestart={restart} />
        )}

        <Disclaimer className="mt-6" />
      </div>
    </>
  );
}

function TriageIntro({ onStart }: { onStart: () => void }) {
  const { t } = useLocale();
  const { isLoggedIn } = useSession();
  return (
    <div className="flex flex-col gap-4">
      <Card tone="dark">
        <div className="flex items-start gap-4">
          <IconChip icon={Info} tone="lime" size="lg" />
          <div>
            <h2 className="text-xl font-semibold">{t('common.disclaimerShort')}</h2>
            <p className="mt-2 text-sm text-white/80">{t('triage.intro.body')}</p>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-white/80">
              <li>• {t('triage.intro.point1')}</li>
              <li>• {t('triage.intro.point2')}</li>
            </ul>
          </div>
        </div>
        <Button className="mt-5" size="lg" leadingIcon={ShieldCheck} onClick={onStart}>
          {t('triage.intro.understand')}
        </Button>
      </Card>
      {isLoggedIn ? (
        <LastResult />
      ) : (
        <p className="text-sm text-brand-muted">{t('triage.intro.guestNote')}</p>
      )}
    </div>
  );
}

function LastResult() {
  const { t, d } = useLocale();
  const query = useLastTriageResult(true);
  return (
    <Card title={t('triage.last.title')} icon={History}>
      <QueryState
        query={query}
        compact
        skeleton={
          <SkeletonGroup>
            <Skeleton shape="text" className="w-1/2" />
          </SkeletonGroup>
        }
        empty={<p className="text-sm text-brand-muted">{t('triage.last.empty')}</p>}
      >
        {(last) => (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge
              tone={
                last.outcome === 'emergency'
                  ? 'emergency'
                  : last.outcome === 'doctor'
                    ? 'lavender'
                    : 'lime'
              }
            >
              {t(`triage.result.${last.outcome}.title`)}
            </Badge>
            <span className="text-brand-muted">
              {t('triage.last.checkedOn', {
                date: d(last.createdAt, {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
              })}
            </span>
          </p>
        )}
      </QueryState>
    </Card>
  );
}

function TriageResult({
  outcome,
  answers,
  onRestart,
}: {
  outcome: TriageOutcome;
  answers: TriageAnswers;
  onRestart: () => void;
}) {
  const { t } = useLocale();
  const { isLoggedIn } = useSession();
  const { openEmergency } = useEmergency();
  const save = useSaveTriageResult();
  const handled = useRef(false);

  useEffect(() => {
    // Run once per result (StrictMode mounts effects twice in development).
    if (handled.current) return;
    handled.current = true;
    if (outcome === 'emergency') openEmergency();
    if (isLoggedIn) save.mutate({ outcome, answers });
  }, [outcome, answers, isLoggedIn, openEmergency, save]);

  return (
    <div className="flex flex-col gap-4">
      <TriageResultCard outcome={outcome} warningSigns={answers.warningSigns} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-muted" aria-live="polite">
          {!isLoggedIn
            ? t('triage.saved.guest')
            : save.isError
              ? t('triage.saved.error')
              : save.isSuccess
                ? t('triage.saved.done')
                : t('triage.saved.saving')}
        </p>
        <Button variant="secondary" leadingIcon={RotateCcw} onClick={onRestart}>
          {t('triage.restart')}
        </Button>
      </div>
    </div>
  );
}
