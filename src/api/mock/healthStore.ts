/**
 * In-memory per-user health records for the mock API (SIMULATED): last symptom-check
 * result, fever/fluid log and prevention-checklist ticks.
 */
import { toIsoDate } from '@/lib/format';
import type {
  FeverLogEntry,
  FeverLogInput,
  PreventionChecklist,
  TriageAnswers,
  TriageOutcome,
  TriageResult,
} from '../types';

export class FeverLogError extends Error {
  constructor(readonly code: 'DUPLICATE_DATE' | 'NOT_FOUND') {
    super(code);
    this.name = 'FeverLogError';
  }
}

export class HealthStore {
  private triage = new Map<string, TriageResult>();
  private feverLog: FeverLogEntry[] = [];
  private checklists = new Map<string, PreventionChecklist>();
  private nextId = 1;

  getLastTriage(userId: string): TriageResult | null {
    const result = this.triage.get(userId);
    return result ? { ...result } : null;
  }

  saveTriage(
    userId: string,
    outcome: TriageOutcome,
    answers: TriageAnswers,
    now: Date,
  ): TriageResult {
    const result: TriageResult = {
      resultId: `tr-${this.nextId++}`,
      userId,
      outcome,
      answers,
      createdAt: now.toISOString(),
    };
    this.triage.set(userId, result);
    return { ...result };
  }

  /** Newest first. */
  listFeverLog(userId: string): FeverLogEntry[] {
    return this.feverLog
      .filter((e) => e.userId === userId)
      .map((e) => ({ ...e }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private assertFreeDate(userId: string, date: string, exceptId?: string) {
    if (this.feverLog.some((e) => e.userId === userId && e.date === date && e.entryId !== exceptId))
      throw new FeverLogError('DUPLICATE_DATE');
  }

  addFeverEntry(userId: string, input: FeverLogInput): FeverLogEntry {
    this.assertFreeDate(userId, input.date);
    const entry: FeverLogEntry = { ...input, entryId: `fl-${this.nextId++}`, userId };
    this.feverLog.push(entry);
    return { ...entry };
  }

  updateFeverEntry(userId: string, entryId: string, input: FeverLogInput): FeverLogEntry {
    const entry = this.feverLog.find((e) => e.entryId === entryId && e.userId === userId);
    if (!entry) throw new FeverLogError('NOT_FOUND');
    this.assertFreeDate(userId, input.date, entryId);
    Object.assign(entry, input);
    return { ...entry };
  }

  deleteFeverEntry(userId: string, entryId: string): void {
    const before = this.feverLog.length;
    this.feverLog = this.feverLog.filter((e) => !(e.entryId === entryId && e.userId === userId));
    if (this.feverLog.length === before) throw new FeverLogError('NOT_FOUND');
  }

  getChecklist(userId: string): PreventionChecklist {
    const list = this.checklists.get(userId);
    return list ? { ...list, checked: [...list.checked] } : { checked: [], updatedAt: '' };
  }

  saveChecklist(userId: string, checked: string[], now: Date): PreventionChecklist {
    const list = { checked: [...new Set(checked)], updatedAt: now.toISOString() };
    this.checklists.set(userId, list);
    return { ...list, checked: [...list.checked] };
  }
}

/** Demo user: a fever that started three days ago, no warning signs yet. */
export function createHealthStore(userId: string, now: Date): HealthStore {
  const store = new HealthStore();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    return toIsoDate(d);
  };
  const seed: FeverLogInput[] = [
    { date: day(3), temperatureC: 38.4, fluidGlasses: 6, urine: 'normal', warningSigns: [] },
    { date: day(2), temperatureC: 39.1, fluidGlasses: 7, urine: 'normal', warningSigns: [] },
    { date: day(1), temperatureC: 38.6, fluidGlasses: 9, urine: 'normal', warningSigns: [] },
  ];
  seed.forEach((entry) => store.addFeverEntry(userId, entry));
  return store;
}
