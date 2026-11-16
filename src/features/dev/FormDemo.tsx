import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Phone, User } from 'lucide-react';
import { z } from 'zod';
import { Button, Input, Select } from '@/components/ui';

const DIVISIONS = [
  'dhaka',
  'chattogram',
  'rajshahi',
  'khulna',
  'barishal',
  'sylhet',
  'rangpur',
  'mymensingh',
] as const;

// Error messages are i18n keys, translated at render time so they follow the language switch.
const schema = z.object({
  fullName: z.string().trim().min(3, 'dev.fullNameError'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'dev.phoneError'),
  division: z.enum(DIVISIONS, { errorMap: () => ({ message: 'dev.divisionError' }) }),
  email: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type ErrorKey = 'dev.fullNameError' | 'dev.phoneError' | 'dev.divisionError';

export function FormDemo() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const errorText = (message?: string) => (message ? t(message as ErrorKey) : undefined);

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitted(true);
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Input
        label={t('dev.fullName')}
        placeholder={t('dev.fullNamePlaceholder')}
        leadingIcon={User}
        autoComplete="name"
        error={errorText(errors.fullName?.message)}
        {...register('fullName')}
      />
      <Input
        label={t('dev.phone')}
        hint={t('dev.phoneHint')}
        leadingIcon={Phone}
        inputMode="tel"
        autoComplete="tel"
        error={errorText(errors.phone?.message)}
        {...register('phone')}
      />
      <Select
        label={t('dev.division')}
        placeholder={t('common.selectPlaceholder')}
        defaultValue=""
        options={DIVISIONS.map((d) => ({ value: d, label: t(`dev.divisions.${d}`) }))}
        error={errorText(errors.division?.message)}
        {...register('division')}
      />
      <Input
        label={t('dev.email')}
        type="email"
        optional
        disabled
        placeholder="—"
        {...register('email')}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" loading={isSubmitting}>
          {t('dev.submit')}
        </Button>
        {submitted && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-[#1F5E3B]">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {t('dev.submitted')}
          </p>
        )}
      </div>
    </form>
  );
}
