/**
 * Symptom-checker rules (UC14). All triage logic lives here as configuration so it can be
 * reviewed by clinicians and unit-tested without the UI. Based on the DGHS dengue guideline
 * warning signs; this is guidance, not a diagnosis.
 *
 * Rules are checked in order and the first match wins. Anything that matches no rule is
 * "monitor at home".
 */
import type {
  AgeGroup,
  FeverDays,
  RiskFactor,
  Symptom,
  TriageAnswers,
  TriageOutcome,
  WarningSign,
} from '@/api/types';

/* ---------- Question options (order = order on screen) ---------- */

export const AGE_GROUPS = ['under5', 'child', 'adult', 'senior'] as const satisfies AgeGroup[];

export const FEVER_DAYS = [
  'none',
  'oneToTwo',
  'threeToFive',
  'sixPlus',
] as const satisfies FeverDays[];

export const SYMPTOMS = [
  'headache',
  'eyePain',
  'bodyAche',
  'rash',
  'nausea',
] as const satisfies Symptom[];

export const WARNING_SIGNS = [
  'bellyPain',
  'vomiting',
  'bleeding',
  'bloodInVomitOrStool',
  'drowsiness',
  'coldClammySkin',
  'lowUrine',
] as const satisfies WarningSign[];

export const RISK_FACTORS = ['pregnancy', 'chronicIllness'] as const satisfies RiskFactor[];

/** The question screens, in order. */
export const TRIAGE_STEPS = [
  'ageGroup',
  'feverDays',
  'symptoms',
  'warningSigns',
  'riskFactors',
] as const;
export type TriageStep = (typeof TRIAGE_STEPS)[number];

/* ---------- Thresholds ---------- */

export const TRIAGE_CONFIG = {
  /** Fever on day 3 or later: the critical phase can begin, so see a doctor. */
  doctorFeverDays: ['threeToFive', 'sixPlus'] as FeverDays[],
  /** Age groups at higher risk of severe dengue. */
  highRiskAges: ['under5', 'senior'] as AgeGroup[],
  /** With fever, this many dengue symptoms means a doctor should check (and test) them. */
  doctorMinSymptoms: 2,
  /** Rash with fever is a reason to see a doctor even with fewer symptoms. */
  doctorSymptoms: ['rash'] as Symptom[],
};

/* ---------- Rules ---------- */

export type TriageRuleId =
  | 'warningSign'
  | 'riskFactorWithFever'
  | 'highRiskAgeWithFever'
  | 'longFever'
  | 'keySymptomWithFever'
  | 'manySymptomsWithFever';

export interface TriageRule {
  id: TriageRuleId;
  outcome: TriageOutcome;
  when: (answers: TriageAnswers) => boolean;
}

const hasFever = (a: TriageAnswers) => a.feverDays !== 'none';

export const TRIAGE_RULES: TriageRule[] = [
  {
    id: 'warningSign',
    outcome: 'emergency',
    when: (a) => a.warningSigns.length > 0,
  },
  {
    id: 'riskFactorWithFever',
    outcome: 'doctor',
    when: (a) => hasFever(a) && a.riskFactors.length > 0,
  },
  {
    id: 'highRiskAgeWithFever',
    outcome: 'doctor',
    when: (a) => hasFever(a) && TRIAGE_CONFIG.highRiskAges.includes(a.ageGroup),
  },
  {
    id: 'longFever',
    outcome: 'doctor',
    when: (a) => TRIAGE_CONFIG.doctorFeverDays.includes(a.feverDays),
  },
  {
    id: 'keySymptomWithFever',
    outcome: 'doctor',
    when: (a) => hasFever(a) && a.symptoms.some((s) => TRIAGE_CONFIG.doctorSymptoms.includes(s)),
  },
  {
    id: 'manySymptomsWithFever',
    outcome: 'doctor',
    when: (a) => hasFever(a) && a.symptoms.length >= TRIAGE_CONFIG.doctorMinSymptoms,
  },
];

export interface TriageEvaluation {
  outcome: TriageOutcome;
  /** The rule that decided the outcome (null = default "monitor at home"). */
  ruleId: TriageRuleId | null;
}

export function evaluateTriage(answers: TriageAnswers): TriageEvaluation {
  const rule = TRIAGE_RULES.find((r) => r.when(answers));
  return rule ? { outcome: rule.outcome, ruleId: rule.id } : { outcome: 'monitor', ruleId: null };
}

/** Any warning sign means emergency: the checker skips the remaining questions. */
export const isEmergency = (warningSigns: readonly WarningSign[]) => warningSigns.length > 0;

export const EMPTY_ANSWERS: Partial<TriageAnswers> = {
  symptoms: [],
  warningSigns: [],
  riskFactors: [],
};

/** True once every question has an answer (multi-select steps may be empty). */
export function isComplete(answers: Partial<TriageAnswers>): answers is TriageAnswers {
  return Boolean(
    answers.ageGroup &&
    answers.feverDays &&
    answers.symptoms &&
    answers.warningSigns &&
    answers.riskFactors,
  );
}
