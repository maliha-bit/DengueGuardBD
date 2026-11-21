import { useCallback } from 'react';
import type { FormErrorCode } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const CODES: FormErrorCode[] = [
  'required',
  'tooShort',
  'tooLong',
  'phone',
  'url',
  'date',
  'number',
  'priceOrder',
  'timeOrder',
  'dateOrder',
  'range',
  'tooManyDays',
  'pastDate',
];

/** Turns a zod error code from lib/staffSchemas into translated text. */
export function useFieldError() {
  const { t } = useLocale();
  return useCallback(
    (message: string | undefined) => {
      if (!message) return undefined;
      const code = (CODES as string[]).includes(message) ? (message as FormErrorCode) : 'required';
      return t(`staff.form.errors.${code}`);
    },
    [t],
  );
}
