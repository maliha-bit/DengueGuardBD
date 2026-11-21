/**
 * Shared zod fields for staff forms. Error messages are codes; components show them with
 * `staff.form.errors.<code>` (see useFieldError).
 */
import { z } from 'zod';

export type FormErrorCode =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'phone'
  | 'url'
  | 'date'
  | 'number'
  | 'priceOrder'
  | 'timeOrder'
  | 'dateOrder'
  | 'range'
  | 'tooManyDays'
  | 'pastDate';

/** Phone with Latin or Bangla digits, spaces or dashes; 6–14 digits, optional "+". */
export function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
}

export const phoneField = z
  .string()
  .trim()
  .transform((v) => normalizeDigits(v).replace(/[\s-]/g, ''))
  .refine((v) => /^\+?[0-9]{6,14}$/.test(v), 'phone');

export const nameField = z.string().trim().min(2, 'tooShort').max(80, 'tooLong');

export const isoDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date');

export const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'required');
