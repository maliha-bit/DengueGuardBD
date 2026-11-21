import { Ban, CalendarX2, Clock } from 'lucide-react';
import { useSlots } from '@/api/queries';
import type { Doctor, Slot } from '@/api/types';
import { QueryState } from '@/components/QueryState';
import { EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatTime, formatWeekday } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { isDoctorAvailable, nextSevenDays } from './slotUtils';

/** Date pills (next 7 days) + slot grid for one doctor. */
export function SlotPicker({
  doctor,
  date,
  onDateChange,
  onPick,
  currentSlotId,
  selectedSlotId,
}: {
  doctor: Doctor;
  date: string | null;
  onDateChange: (isoDate: string) => void;
  onPick: (slot: Slot) => void;
  /** The appointment being rescheduled (shown as "current", not pickable). */
  currentSlotId?: string;
  selectedSlotId?: string | null;
}) {
  const { t, n, d, lang } = useLocale();
  const days = nextSevenDays();
  const slots = useSlots(doctor.doctorId, date);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 id={`dates-${doctor.doctorId}`} className="mb-2 text-sm font-semibold">
          {t('booking.dateLabel')}
        </h3>
        <div
          role="group"
          aria-labelledby={`dates-${doctor.doctorId}`}
          className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {days.map((day, i) => {
            const available = isDoctorAvailable(doctor, day);
            const selected = day === date;
            return (
              <button
                key={day}
                type="button"
                disabled={!available}
                aria-pressed={selected}
                onClick={() => onDateChange(day)}
                className={cn(
                  'flex min-h-16 min-w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl px-2 text-center transition-colors',
                  selected && 'bg-brand-ink text-white',
                  !selected &&
                    available &&
                    'bg-white ring-1 ring-inset ring-brand-line hover:bg-brand-canvas',
                  !available && 'cursor-not-allowed bg-brand-canvas text-brand-muted',
                )}
              >
                <span className="text-[11px] font-medium">
                  {i === 0 ? t('booking.today') : formatWeekday(day, lang)}
                </span>
                <span className="text-lg font-semibold leading-tight">
                  {d(day, { day: 'numeric' })}
                </span>
                {!available && (
                  <span className="text-[10px]">
                    {t('booking.off')}
                    <span className="sr-only"> — {t('booking.offLabel')}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {date && (
        <section aria-labelledby={`slots-${doctor.doctorId}`}>
          <h3 id={`slots-${doctor.doctorId}`} className="mb-2 text-sm font-semibold">
            {t('booking.slotsLabel', {
              date: d(date, { weekday: 'long', day: 'numeric', month: 'long' }),
            })}
          </h3>
          <QueryState
            query={slots}
            compact
            isEmpty={(list) => list.length === 0}
            skeleton={
              <SkeletonGroup className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} shape="rect" className="h-20" />
                ))}
              </SkeletonGroup>
            }
            empty={
              <EmptyState
                compact
                icon={CalendarX2}
                title={t('booking.slotsEmptyTitle')}
                message={t('booking.slotsEmptyMessage')}
              />
            }
          >
            {(list) => (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {list.map((slot) => {
                  const left = slot.capacity - slot.booked;
                  const full = left <= 0;
                  const isCurrent = slot.slotId === currentSlotId;
                  const selected = slot.slotId === selectedSlotId;
                  return (
                    <li key={slot.slotId}>
                      <button
                        type="button"
                        disabled={full || isCurrent}
                        aria-pressed={selected}
                        onClick={() => onPick(slot)}
                        className={cn(
                          'flex min-h-20 w-full flex-col items-start justify-center gap-1 rounded-2xl px-3 text-left transition-colors',
                          selected && 'bg-brand-ink text-white',
                          !selected &&
                            !full &&
                            !isCurrent &&
                            'bg-white ring-1 ring-inset ring-brand-line hover:bg-brand-lime-soft',
                          (full || isCurrent) &&
                            'cursor-not-allowed bg-brand-canvas text-brand-muted',
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5 text-base font-semibold">
                          <Clock aria-hidden="true" className="h-4 w-4" />
                          {formatTime(slot.start, lang)}
                        </span>
                        {isCurrent ? (
                          <span className="text-xs font-medium">{t('booking.currentSlot')}</span>
                        ) : full ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            {t('booking.full')}
                          </span>
                        ) : (
                          <span className="text-xs">
                            {t('booking.placesLeft', { left: n(left), total: n(slot.capacity) })}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </QueryState>
        </section>
      )}
    </div>
  );
}
