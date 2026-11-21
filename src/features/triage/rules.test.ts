import { describe, expect, it } from 'vitest';
import type { TriageAnswers } from '@/api/types';
import { evaluateTriage, isComplete, WARNING_SIGNS } from './rules';

const base: TriageAnswers = {
  ageGroup: 'adult',
  feverDays: 'oneToTwo',
  symptoms: [],
  warningSigns: [],
  riskFactors: [],
};
const answers = (overrides: Partial<TriageAnswers>): TriageAnswers => ({ ...base, ...overrides });

describe('triage rules', () => {
  it.each(WARNING_SIGNS)('warning sign "%s" gives the emergency outcome', (sign) => {
    expect(evaluateTriage(answers({ warningSigns: [sign] }))).toEqual({
      outcome: 'emergency',
      ruleId: 'warningSign',
    });
  });

  it('a warning sign wins even without fever or other symptoms', () => {
    expect(evaluateTriage(answers({ feverDays: 'none', warningSigns: ['lowUrine'] })).outcome).toBe(
      'emergency',
    );
  });

  it('a warning sign wins over every "doctor" reason', () => {
    const result = evaluateTriage(
      answers({
        ageGroup: 'senior',
        feverDays: 'sixPlus',
        symptoms: ['rash', 'headache'],
        riskFactors: ['pregnancy'],
        warningSigns: ['bleeding', 'vomiting'],
      }),
    );
    expect(result.outcome).toBe('emergency');
  });

  it('early fever with no or one symptom: monitor at home', () => {
    expect(evaluateTriage(base)).toEqual({ outcome: 'monitor', ruleId: null });
    expect(evaluateTriage(answers({ symptoms: ['headache'] })).outcome).toBe('monitor');
  });

  it('no fever and no warning signs: monitor at home', () => {
    expect(
      evaluateTriage(answers({ feverDays: 'none', symptoms: ['headache', 'bodyAche'] })).outcome,
    ).toBe('monitor');
  });

  it('fever for 3 days or more: book a doctor', () => {
    expect(evaluateTriage(answers({ feverDays: 'threeToFive' }))).toEqual({
      outcome: 'doctor',
      ruleId: 'longFever',
    });
    expect(evaluateTriage(answers({ feverDays: 'sixPlus' })).outcome).toBe('doctor');
  });

  it('pregnancy or long-term illness with fever: book a doctor', () => {
    expect(evaluateTriage(answers({ riskFactors: ['pregnancy'] })).ruleId).toBe(
      'riskFactorWithFever',
    );
    expect(evaluateTriage(answers({ riskFactors: ['chronicIllness'] })).outcome).toBe('doctor');
  });

  it('pregnancy without fever is not by itself a reason to book', () => {
    expect(evaluateTriage(answers({ feverDays: 'none', riskFactors: ['pregnancy'] })).outcome).toBe(
      'monitor',
    );
  });

  it('young children and older adults with fever: book a doctor', () => {
    expect(evaluateTriage(answers({ ageGroup: 'under5' })).ruleId).toBe('highRiskAgeWithFever');
    expect(evaluateTriage(answers({ ageGroup: 'senior' })).outcome).toBe('doctor');
    expect(evaluateTriage(answers({ ageGroup: 'child' })).outcome).toBe('monitor');
  });

  it('rash with fever: book a doctor', () => {
    expect(evaluateTriage(answers({ symptoms: ['rash'] })).ruleId).toBe('keySymptomWithFever');
  });

  it('two or more dengue symptoms with fever: book a doctor', () => {
    expect(evaluateTriage(answers({ symptoms: ['headache', 'eyePain'] }))).toEqual({
      outcome: 'doctor',
      ruleId: 'manySymptomsWithFever',
    });
  });

  it('knows when all questions are answered', () => {
    expect(isComplete(base)).toBe(true);
    expect(isComplete({ ageGroup: 'adult', symptoms: [], warningSigns: [], riskFactors: [] })).toBe(
      false,
    );
  });
});
