import { Building2, Landmark, MapPin, Navigation, Phone, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Hospital, HospitalSummary } from '@/api/types';
import { Freshness } from '@/components/Freshness';
import { Badge, buttonClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { directionsUrl } from '@/lib/geo';
import { useLocale } from '@/lib/useLocale';
import { BedStat } from './BedStat';

export function HospitalTypeBadge({ type }: { type: Hospital['type'] }) {
  const { t } = useLocale();
  return (
    <Badge
      tone={type === 'government' ? 'lavender' : 'neutral'}
      icon={type === 'government' ? Landmark : Building2}
    >
      {t(`hospitals.type.${type}`)}
    </Badge>
  );
}

/** Call + Directions links (tel: and Google Maps). */
export function HospitalContactLinks({ hospital }: { hospital: Hospital }) {
  const { t, l } = useLocale();
  const name = l(hospital.name);
  return (
    <>
      <a
        href={`tel:${hospital.phone}`}
        aria-label={t('hospitals.callLabel', { name })}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        <Phone aria-hidden="true" className="h-4 w-4" />
        {t('hospitals.call')}
      </a>
      <a
        href={directionsUrl(hospital.location)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('hospitals.directionsLabel', { name })}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        <Navigation aria-hidden="true" className="h-4 w-4" />
        {t('hospitals.directions')}
      </a>
    </>
  );
}

export function HospitalBeds({ summary }: { summary: HospitalSummary }) {
  const { t } = useLocale();
  const { beds } = summary;
  return (
    <div className="grid grid-cols-2 gap-4">
      <BedStat
        label={t('hospitals.generalBeds')}
        available={beds.generalAvailable}
        total={beds.generalTotal}
      />
      <BedStat
        label={t('hospitals.icuBeds')}
        available={beds.icuAvailable}
        total={beds.icuTotal}
        barClass="bg-brand-ink"
      />
    </div>
  );
}

/** Search result card. */
export function HospitalCard({
  summary,
  distanceKm,
  className,
}: {
  summary: HospitalSummary;
  distanceKm?: number;
  className?: string;
}) {
  const { t, l, n } = useLocale();
  const { hospital, beds } = summary;
  return (
    <article className={cn('flex flex-col rounded-3xl bg-white p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold">{l(hospital.name)}</h2>
        <HospitalTypeBadge type={hospital.type} />
      </div>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-brand-muted">
        <MapPin aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          {l(hospital.address)}
          {distanceKm !== undefined && (
            <> · {t('hospitals.kmAway', { km: n(distanceKm, { maximumFractionDigits: 0 }) })}</>
          )}
        </span>
      </p>

      <div className="mt-4">
        <HospitalBeds summary={summary} />
      </div>
      <Freshness updatedAt={beds.updatedAt} className="mt-3" />

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <HospitalContactLinks hospital={hospital} />
        <Link
          to={`/hospitals/${hospital.hospitalId}`}
          className={cn(buttonClasses({ size: 'sm' }), 'ml-auto')}
        >
          <Stethoscope aria-hidden="true" className="h-4 w-4" />
          {t('hospitals.seeDoctors')}
        </Link>
      </div>
    </article>
  );
}
