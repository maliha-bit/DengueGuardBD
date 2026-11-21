import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, HeartHandshake, Lock, Save, ShieldCheck, UserCog } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  useCurrentUser,
  useDivisions,
  useMyDonorProfile,
  useSaveDonorProfile,
  useSetDonorAvailability,
} from '@/api/queries';
import type { DonationType, DonorProfile } from '@/api/types';
import { RequireLogin } from '@/app/RequireLogin';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Button, Card, EmptyState, Input, Select, SkeletonCard, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { isInRecovery, nextEligibleDate } from '@/lib/donorRules';
import { toIsoDate } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { DonorTabs } from './DonorTabs';
import { BLOOD_GROUPS, DONATION_TYPES, isValidBdMobile, normalizePhone } from './donorUtils';

/** Donor profile: consent → form → availability (UC24–UC25). */
export default function DonorProfilePage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('donors.profile.title')} message={t('donors.profile.loginMessage')}>
      <DonorProfileScreen />
    </RequireLogin>
  );
}

function DonorProfileScreen() {
  const { t } = useLocale();
  const user = useCurrentUser();
  const profile = useMyDonorProfile();
  const [consented, setConsented] = useState(false);
  const staff = user.data && user.data.role !== 'citizen' && user.data.role !== 'donor';

  return (
    <>
      <PageHeader title={t('donors.profile.title')} subtitle={t('donors.profile.subtitle')} />
      <DonorTabs />
      {staff ? (
        <Card>
          <EmptyState
            icon={UserCog}
            title={t('donors.profile.staffTitle')}
            message={t('donors.profile.staffMessage')}
          />
        </Card>
      ) : (
        <QueryState
          query={profile}
          skeleton={<SkeletonCard />}
          // No profile yet (null) starts the "Become a donor" flow.
          empty={
            <ProfileBody
              profile={null}
              consented={consented}
              onConsent={() => setConsented(true)}
            />
          }
        >
          {(data) => (
            <ProfileBody
              profile={data}
              consented={consented}
              onConsent={() => setConsented(true)}
            />
          )}
        </QueryState>
      )}
    </>
  );
}

function ProfileBody({
  profile,
  consented,
  onConsent,
}: {
  profile: DonorProfile | null;
  consented: boolean;
  onConsent: () => void;
}) {
  if (!profile && !consented) return <ConsentCard onAgree={onConsent} />;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
      <ProfileForm profile={profile} />
      {profile && <AvailabilityCard profile={profile} />}
    </div>
  );
}

function ConsentCard({ onAgree }: { onAgree: () => void }) {
  const { t } = useLocale();
  const [agreed, setAgreed] = useState(false);
  return (
    <Card tone="dark" className="max-w-2xl">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-ink"
        >
          <HeartHandshake className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">{t('donors.consent.title')}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-white/85">
            {(['hidden', 'accept', 'availability', 'stop'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2">
                <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" />
                {t(`donors.consent.points.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <label className="mt-5 flex min-h-touch cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="h-5 w-5 accent-brand-lime"
        />
        {t('donors.consent.agree')}
      </label>
      <Button
        className="mt-4"
        size="lg"
        leadingIcon={ShieldCheck}
        disabled={!agreed}
        onClick={onAgree}
      >
        {t('donors.consent.continue')}
      </Button>
    </Card>
  );
}

type ProfileErrorKey = 'district' | 'phone' | 'dateFuture';

function profileSchema(today: string) {
  return z.object({
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    donationType: z.enum(['whole_blood', 'platelets', 'both']),
    districtId: z.string().min(1, 'district' satisfies ProfileErrorKey),
    lastDonationDate: z
      .string()
      .refine((v) => v === '' || v <= today, 'dateFuture' satisfies ProfileErrorKey),
    phone: z.string().refine(isValidBdMobile, 'phone' satisfies ProfileErrorKey),
    shareAfterAccept: z.boolean(),
  });
}
type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;

/** "You can donate again on …" notice, or nothing. */
function RecoveryNotice({
  type,
  lastDonation,
}: {
  type: DonationType;
  lastDonation: string | null;
}) {
  const { t, d } = useLocale();
  if (!isInRecovery(type, lastDonation)) return null;
  const next = nextEligibleDate(type, lastDonation);
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-2xl bg-[#FCF0D6] p-3 text-sm text-[#6B4A06]"
    >
      <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <span className="block font-medium">
          {t('donors.recovery.again', {
            date: next ? d(next, { day: 'numeric', month: 'long', year: 'numeric' }) : '',
          })}
        </span>
        {t('donors.recovery.explain')}
      </span>
    </p>
  );
}

function ProfileForm({ profile }: { profile: DonorProfile | null }) {
  const { t, l } = useLocale();
  const toast = useToast();
  const save = useSaveDonorProfile();
  const divisions = useDivisions();
  const today = toIsoDate(new Date());
  const schema = useMemo(() => profileSchema(today), [today]);
  const districtOptions = useMemo(
    () =>
      (divisions.data ?? []).flatMap((div) =>
        div.districts.map((d) => ({ value: d.districtId, label: `${l(d.name)} (${l(div.name)})` })),
      ),
    [divisions.data, l],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bloodGroup: profile?.bloodGroup ?? 'O+',
      donationType: profile?.donationType ?? 'both',
      districtId: profile?.districtId ?? '',
      lastDonationDate: profile?.lastDonationDate ?? '',
      phone: profile?.phone ?? '',
      shareAfterAccept: profile?.shareAfterAccept ?? true,
    },
  });
  const [type, lastDonation] = useWatch({ control, name: ['donationType', 'lastDonationDate'] });
  const err = (key?: string) =>
    key ? t(`donors.profile.errors.${key as ProfileErrorKey}`) : undefined;

  const submit = handleSubmit((values) => {
    save.mutate(
      {
        ...values,
        lastDonationDate: values.lastDonationDate || null,
        phone: normalizePhone(values.phone),
      },
      {
        onSuccess: () =>
          toast({
            tone: 'success',
            message: profile ? t('donors.profile.saved') : t('donors.profile.welcome'),
          }),
        onError: () => toast({ tone: 'error', message: t('donors.profile.saveError') }),
      },
    );
  });

  return (
    <Card
      title={profile ? t('donors.profile.editTitle') : t('donors.profile.createTitle')}
      titleAs="h2"
      icon={HeartHandshake}
    >
      <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('donors.bloodGroup')}
          options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
          {...register('bloodGroup')}
        />
        <Select
          label={t('donors.donationType')}
          options={DONATION_TYPES.map((v) => ({ value: v, label: t(`donors.types.${v}`) }))}
          {...register('donationType')}
        />
        <Select
          label={t('donors.district')}
          placeholder={t('common.selectPlaceholder')}
          options={districtOptions}
          error={err(errors.districtId?.message)}
          {...register('districtId')}
        />
        <Input
          type="date"
          label={t('donors.profile.lastDonation')}
          optional
          max={today}
          hint={t('donors.profile.lastDonationHint')}
          error={err(errors.lastDonationDate?.message)}
          {...register('lastDonationDate')}
        />
        <div className="sm:col-span-2">
          <RecoveryNotice type={type} lastDonation={lastDonation || null} />
        </div>
        <Input
          label={t('donors.profile.phone')}
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          error={err(errors.phone?.message)}
          {...register('phone')}
        />
        <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-2xl bg-brand-canvas px-4 py-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-ink"
            {...register('shareAfterAccept')}
          />
          <span>
            <span className="block font-medium">{t('donors.profile.shareAfterAccept')}</span>
            <span className="text-brand-muted">{t('donors.profile.shareAfterAcceptHint')}</span>
          </span>
        </label>
        <Button type="submit" leadingIcon={Save} loading={save.isPending} className="sm:col-span-2">
          {profile ? t('donors.profile.save') : t('donors.profile.become')}
        </Button>
      </form>
    </Card>
  );
}

function AvailabilityCard({ profile }: { profile: DonorProfile }) {
  const { t } = useLocale();
  const toast = useToast();
  const setAvailability = useSetDonorAvailability();
  const recovering = isInRecovery(profile.donationType, profile.lastDonationDate);
  const on = profile.available && !recovering;

  return (
    <Card title={t('donors.availability.title')} titleAs="h2" icon={CalendarClock}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t('donors.availability.label')}
        disabled={recovering || setAvailability.isPending}
        onClick={() =>
          setAvailability.mutate(!on, {
            onError: () => toast({ tone: 'error', message: t('donors.profile.saveError') }),
          })
        }
        className={cn(
          'relative flex min-h-16 w-full items-center rounded-full p-1.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          on ? 'bg-brand-lime text-brand-ink' : 'bg-brand-canvas text-brand-muted',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1.5 h-[calc(100%-0.75rem)] w-[calc(50%-0.375rem)] rounded-full bg-white shadow transition-[left]',
            on ? 'left-1/2' : 'left-1.5',
          )}
        />
        <span className={cn('relative z-10 flex-1 text-center', !on && 'text-brand-ink')}>
          {t('donors.availability.off')}
        </span>
        <span className={cn('relative z-10 flex-1 text-center', on && 'text-brand-ink')}>
          {t('donors.availability.on')}
        </span>
      </button>
      <p className="mt-3 text-sm text-brand-muted">
        {on ? t('donors.availability.onHint') : t('donors.availability.offHint')}
      </p>
      <div className="mt-3">
        <RecoveryNotice type={profile.donationType} lastDonation={profile.lastDonationDate} />
      </div>
    </Card>
  );
}
