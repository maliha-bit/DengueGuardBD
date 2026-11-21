import { z } from 'zod';
import type { FeverLogEntry, FeverLogInput, WarningSign } from '@/api/types';
import { parseLocaleNumber } from '@/lib/format';

export type TempUnit = 'C' | 'F';

export const TEMP_RANGE: Record<TempUnit, { min: number; max: number }> = {
  C: { min: 34, max: 43 },
  F: { min: 93.2, max: 109.4 },
};
export const MAX_GLASSES = 30;
/** 38 °C and above counts as fever. */
export const FEVER_C = 38;

const round1 = (value: number) => Math.round(value * 10) / 10;
export const cToF = (c: number) => round1((c * 9) / 5 + 32);
export const fToC = (f: number) => round1(((f - 32) * 5) / 9);
export const toUnit = (c: number, unit: TempUnit) => (unit === 'C' ? round1(c) : cToF(c));

/** zod messages are locale keys under feverLog.errors. */
export type FeverErrorKey =
  | 'dateRequired'
  | 'dateFuture'
  | 'dateDuplicate'
  | 'tempRequired'
  | 'tempRange'
  | 'fluidsRequired'
  | 'fluidsRange';

const err = (key: FeverErrorKey) => key;

export interface FeverFormValues {
  date: string;
  unit: TempUnit;
  temperature: string;
  fluidGlasses: string;
  urine: 'normal' | 'less';
  warningSigns: WarningSign[];
}

/** Form schema. `takenDates` are dates that already have an entry (excluding the one edited). */
export function feverEntrySchema(takenDates: string[], today: string) {
  return z
    .object({
      date: z.string().min(1, err('dateRequired')),
      unit: z.enum(['C', 'F']),
      temperature: z.string().min(1, err('tempRequired')),
      fluidGlasses: z.string().min(1, err('fluidsRequired')),
      urine: z.enum(['normal', 'less']),
      warningSigns: z.array(
        z.enum([
          'bellyPain',
          'vomiting',
          'bleeding',
          'bloodInVomitOrStool',
          'drowsiness',
          'coldClammySkin',
          'lowUrine',
        ]),
      ),
    })
    .superRefine((values, ctx) => {
      if (values.date && values.date > today) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: err('dateFuture') });
      } else if (takenDates.includes(values.date)) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: err('dateDuplicate') });
      }
      if (values.temperature) {
        const temp = parseLocaleNumber(values.temperature);
        const { min, max } = TEMP_RANGE[values.unit];
        if (Number.isNaN(temp) || temp < min || temp > max) {
          ctx.addIssue({ code: 'custom', path: ['temperature'], message: err('tempRange') });
        }
      }
      if (values.fluidGlasses) {
        const glasses = parseLocaleNumber(values.fluidGlasses);
        if (!Number.isInteger(glasses) || glasses < 0 || glasses > MAX_GLASSES) {
          ctx.addIssue({ code: 'custom', path: ['fluidGlasses'], message: err('fluidsRange') });
        }
      }
    });
}

export function toInput(values: FeverFormValues): FeverLogInput {
  const temp = parseLocaleNumber(values.temperature);
  return {
    date: values.date,
    temperatureC: values.unit === 'C' ? round1(temp) : fToC(temp),
    fluidGlasses: parseLocaleNumber(values.fluidGlasses),
    urine: values.urine,
    warningSigns: values.warningSigns,
  };
}

export function toFormValues(
  entry: FeverLogEntry | null,
  unit: TempUnit,
  today: string,
): FeverFormValues {
  if (!entry) {
    return {
      date: today,
      unit,
      temperature: '',
      fluidGlasses: '',
      urine: 'normal',
      warningSigns: [],
    };
  }
  return {
    date: entry.date,
    unit,
    temperature: String(toUnit(entry.temperatureC, unit)),
    fluidGlasses: String(entry.fluidGlasses),
    urine: entry.urine,
    warningSigns: [...entry.warningSigns],
  };
}

export const hasWarningSign = (entries: FeverLogEntry[]) =>
  entries.some((entry) => entry.warningSigns.length > 0);
