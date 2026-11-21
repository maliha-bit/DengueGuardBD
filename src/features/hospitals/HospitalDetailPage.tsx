import { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Hospital as HospitalIcon,
  MousePointerClick,
  Stethoscope,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDoctors, useHospital, useSlots } from '@/api/queries';
import type { Doctor, Slot } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Badge,
  buttonClasses,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonGroup,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { weekdayName } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { BookingFlow } from './BookingFlow';
import { HospitalBeds, HospitalContactLinks, HospitalTypeBadge } from './HospitalCard';
import { SlotPicker } from './SlotPicker';
import { firstAvailableDate } from './slotUtils';

/** Mon–Thu style list of a doctor's working days, Saturday first (Bangladesh week). */
function DoctorDays({ doctor }: { doctor: Doctor }) {
  const { t, lang } = useLocale();
  const order = [6, 0, 1, 2, 3, 4, 5];
  const days = order.filter((day) =>
    doctor.availableDays.includes(day as Doctor['availableDays'][number]),
  );
  return (
    <p className="text-xs text-brand-muted">
      {t('hospitalDetail.availableOn', {
        days: days.map((day) => weekdayName(day, lang)).join(', '),
      })}
    </p>
  );
}

function DoctorList({
  doctors,
  selectedId,
  onSelect,
}: {
  doctors: Doctor[];
  selectedId: string | null;
  onSelect: (doctor: Doctor) => void;
}) {
  const { t, l } = useLocale();
  return (
    <ul className="flex flex-col gap-2">
      {doctors.map((doctor) => {
        const selected = doctor.doctorId === selectedId;
        return (
          <li key={doctor.doctorId}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(doctor)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors',
                selected ? 'bg-brand-ink text-white' : 'bg-brand-canvas hover:bg-brand-lime-soft',
              )}
            >
              <Avatar name={doctor.name.en} tone={selected ? 'lime' : 'lavender'} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{l(doctor.name)}</span>
                <span
                  className={cn('block text-xs', selected ? 'text-white/75' : 'text-brand-muted')}
                >
                  {l(doctor.specialty)}
                </span>
                <span className={cn('block', selected && '[&_p]:text-white/75')}>
                  <DoctorDays doctor={doctor} />
                </span>
              </span>
              <span
                className={cn(
                  'inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold',
                  selected ? 'bg-brand-lime text-brand-ink' : 'bg-white',
                )}
              >
                {selected && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                {selected ? t('hospitalDetail.chosen') : t('hospitalDetail.choose')}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function HospitalDetailPage() {
  const { t, l } = useLocale();
  const { hospitalId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const hospital = useHospital(hospitalId);
  const doctors = useDoctors(hospitalId);
  const pickerRef = useRef<HTMLDivElement>(null);

  const doctorId = params.get('doctor');
  const date = params.get('date');
  const slotId = params.get('slot');
  const doctor = doctors.data?.find((d) => d.doctorId === doctorId) ?? null;
  // Same query as the grid, so the chosen slot always has live place counts.
  const slots = useSlots(doctor?.doctorId ?? null, date);
  const slot: Slot | null = slots.data?.find((s) => s.slotId === slotId) ?? null;

  const setParam = (changes: Record<string, string | null>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });

  const chooseDoctor = (next: Doctor) => {
    setParam({ doctor: next.doctorId, date: firstAvailableDate(next), slot: null });
  };

  useEffect(() => {
    if (doctorId) pickerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [doctorId]);

  if (hospital.isPending) {
    return (
      <SkeletonGroup className="mt-7 grid gap-4 lg:grid-cols-2">
        <Skeleton shape="rect" className="h-12 w-2/3 lg:col-span-2" />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </SkeletonGroup>
    );
  }
  if (hospital.isError) {
    return (
      <Card className="mt-7">
        <ErrorState onRetry={() => void hospital.refetch()} retrying={hospital.isFetching} />
      </Card>
    );
  }
  if (!hospital.data) {
    return (
      <>
        <PageHeader title={t('hospitalDetail.notFoundTitle')} />
        <Card>
          <EmptyState
            icon={HospitalIcon}
            title={t('hospitalDetail.notFoundTitle')}
            message={t('hospitalDetail.notFoundMessage')}
            action={
              <Link to="/hospitals" className={buttonClasses({ size: 'sm' })}>
                {t('hospitalDetail.back')}
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const summary = hospital.data;
  const h = summary.hospital;

  return (
    <>
      <Link
        to="/hospitals"
        className="mt-5 inline-flex min-h-touch items-center gap-2 rounded-full pr-3 text-sm font-medium text-brand-muted hover:text-brand-ink"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('hospitalDetail.back')}
      </Link>
      <PageHeader title={l(h.name)} subtitle={l(h.address)} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <HospitalTypeBadge type={h.type} />
              <Badge tone="neutral">{l(h.district)}</Badge>
              <Badge tone="lavender">{t('common.simulatedData')}</Badge>
            </div>
            <HospitalBeds summary={summary} />
            <Freshness updatedAt={summary.beds.updatedAt} className="mt-3" />
            <div className="mt-4 flex flex-wrap gap-2">
              <HospitalContactLinks hospital={h} />
            </div>
          </Card>

          <Card title={t('hospitalDetail.doctorsTitle')} icon={Stethoscope}>
            <QueryState
              query={doctors}
              compact
              isEmpty={(list) => list.length === 0}
              skeleton={
                <SkeletonGroup className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} shape="rect" className="h-20" />
                  ))}
                </SkeletonGroup>
              }
              empty={
                <EmptyState
                  compact
                  icon={Stethoscope}
                  title={t('hospitalDetail.doctorsEmptyTitle')}
                  message={t('hospitalDetail.doctorsEmptyMessage')}
                />
              }
            >
              {(list) => (
                <DoctorList doctors={list} selectedId={doctorId} onSelect={chooseDoctor} />
              )}
            </QueryState>
          </Card>
        </div>

        <div ref={pickerRef} className="min-w-0 scroll-mt-4">
          <Card title={t('hospitalDetail.bookTitle')} className="lg:sticky lg:top-4">
            {doctor ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar name={doctor.name.en} tone="lime" />
                  <div>
                    <p className="text-sm font-semibold">{l(doctor.name)}</p>
                    <p className="text-xs text-brand-muted">{l(doctor.specialty)}</p>
                  </div>
                </div>
                <SlotPicker
                  doctor={doctor}
                  date={date}
                  onDateChange={(next) => setParam({ date: next, slot: null })}
                  onPick={(picked) => setParam({ slot: picked.slotId })}
                  selectedSlotId={slotId}
                />
              </>
            ) : (
              <EmptyState
                icon={MousePointerClick}
                title={t('hospitalDetail.chooseDoctorTitle')}
                message={t('hospitalDetail.chooseDoctorMessage')}
              />
            )}
          </Card>
        </div>
      </div>

      {doctor && (
        <BookingFlow
          hospital={h}
          doctor={doctor}
          slot={slot}
          onClose={() => setParam({ slot: null })}
        />
      )}
    </>
  );
}
