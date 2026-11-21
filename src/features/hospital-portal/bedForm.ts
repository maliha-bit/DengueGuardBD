import { z } from 'zod';
import type { BedAvailability } from '@/api/types';
import { validateBedCount } from '@/lib/beds';

/** Form schema: each count must be a whole number from 0 to its ward total. */
export function bedSchema(beds: Pick<BedAvailability, 'generalTotal' | 'icuTotal'>) {
  return z
    .object({ generalAvailable: z.number(), icuAvailable: z.number() })
    .superRefine((value, ctx) => {
      const general = validateBedCount(value.generalAvailable, beds.generalTotal);
      if (general) ctx.addIssue({ code: 'custom', path: ['generalAvailable'], message: general });
      const icu = validateBedCount(value.icuAvailable, beds.icuTotal);
      if (icu) ctx.addIssue({ code: 'custom', path: ['icuAvailable'], message: icu });
    });
}

export type BedFormValues = z.infer<ReturnType<typeof bedSchema>>;
