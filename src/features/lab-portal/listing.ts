import { z } from 'zod';
import type { DayHours, Lab, LabListingInput, LabTestCode } from '@/api/types';
import { nameField, phoneField, timeField } from '@/lib/staffSchemas';

export const LAB_TEST_CODES: LabTestCode[] = ['ns1', 'igm_igg', 'cbc'];

const dayHoursSchema = z
  .object({ kind: z.enum(['closed', 'allDay', 'hours']), opens: timeField, closes: timeField })
  .refine((h) => h.kind !== 'hours' || h.opens !== h.closes, {
    message: 'timeOrder',
    path: ['closes'],
  });

const price = z.coerce
  .number({ invalid_type_error: 'number' })
  .int('number')
  .min(0, 'number')
  .max(100000, 'number');

export const listingSchema = z.object({
  name: nameField,
  nameBn: nameField,
  address: z.string().trim().min(5, 'tooShort').max(160, 'tooLong'),
  phone: phoneField,
  homeCollection: z.boolean(),
  weeklyHours: z.array(dayHoursSchema).length(7),
  tests: z
    .array(
      z
        .object({
          code: z.enum(['ns1', 'igm_igg', 'cbc']),
          offered: z.boolean(),
          priceBdt: price,
          priceMaxBdt: price,
        })
        .refine((t) => !t.offered || t.priceBdt <= t.priceMaxBdt, {
          message: 'priceOrder',
          path: ['priceMaxBdt'],
        }),
    )
    .refine((tests) => tests.some((t) => t.offered), { message: 'required' }),
});

export type ListingForm = z.input<typeof listingSchema>;
export type ListingValues = z.output<typeof listingSchema>;

/** Lab → form values (every weekday gets a row, every test a row). */
export function toListingForm(lab: Lab): ListingForm {
  const weekly: DayHours[] =
    lab.weeklyHours ??
    Array.from({ length: 7 }, () =>
      lab.openingHours
        ? { kind: 'hours' as const, ...lab.openingHours }
        : { kind: 'allDay' as const },
    );
  return {
    name: lab.name.en,
    nameBn: lab.name.bn,
    address: lab.address.en,
    phone: lab.phone,
    homeCollection: lab.homeCollection,
    weeklyHours: weekly.map((h) =>
      h.kind === 'hours'
        ? { kind: 'hours', opens: h.opens, closes: h.closes }
        : { kind: h.kind, opens: '08:00', closes: '20:00' },
    ),
    tests: LAB_TEST_CODES.map((code) => {
      const test = lab.tests.find((x) => x.code === code);
      return {
        code,
        offered: Boolean(test),
        priceBdt: test?.priceBdt ?? 0,
        priceMaxBdt: test?.priceMaxBdt ?? 0,
      };
    }),
  };
}

export function toListingInput(values: ListingValues): LabListingInput {
  return {
    name: values.name,
    nameBn: values.nameBn,
    address: values.address,
    phone: values.phone,
    homeCollection: values.homeCollection,
    weeklyHours: values.weeklyHours.map<DayHours>((h) =>
      h.kind === 'hours' ? { kind: 'hours', opens: h.opens, closes: h.closes } : { kind: h.kind },
    ),
    tests: values.tests
      .filter((t) => t.offered)
      .map((t) => ({ code: t.code, priceBdt: t.priceBdt, priceMaxBdt: t.priceMaxBdt })),
  };
}

/** How citizens will see the listing (today's hours, offered tests only). */
export function previewLab(base: Lab, form: ListingForm, now: Date = new Date()): Lab {
  const today = form.weeklyHours[now.getDay()];
  const openingHours =
    !today || today.kind === 'allDay'
      ? null
      : today.kind === 'closed'
        ? { opens: '00:00', closes: '00:00' }
        : { opens: today.opens, closes: today.closes };
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    ...base,
    name: { en: form.name || base.name.en, bn: form.nameBn || base.name.bn },
    address: { en: form.address || base.address.en, bn: form.address || base.address.bn },
    phone: form.phone,
    homeCollection: form.homeCollection,
    openingHours,
    tests: form.tests
      .filter((t) => t.offered)
      .map((t) => ({
        testId: `${base.labId}-${t.code}`,
        labId: base.labId,
        code: t.code,
        priceBdt: num(t.priceBdt),
        priceMaxBdt: num(t.priceMaxBdt),
        turnaroundHours: base.tests.find((x) => x.code === t.code)?.turnaroundHours ?? 6,
      })),
  };
}
