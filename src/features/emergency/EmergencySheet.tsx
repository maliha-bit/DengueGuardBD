import { useMemo } from 'react';
import {
  CheckCircle2,
  Hospital as HospitalIcon,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Share2,
} from 'lucide-react';
import { useDivisions, useHospitals } from '@/api/queries';
import { useDivision } from '@/app/division';
import { Disclaimer } from '@/components/Disclaimer';
import { EmergencyNumbers } from '@/components/EmergencyNumbers';
import { QueryState } from '@/components/QueryState';
import {
  Button,
  buttonClasses,
  EmptyState,
  IconChip,
  Sheet,
  Skeleton,
  SkeletonGroup,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { directionsUrl } from '@/lib/geo';
import { useLocale } from '@/lib/useLocale';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { locationUrl, nearestEmergencyHospital } from './emergencyUtils';
import { useGeolocation, type GeoStatus } from './useGeolocation';

const WHAT_TO_DO = ['fluids', 'noNsaids', 'goNow', 'bringRecords'] as const;

/** App-wide emergency help (UC17): hotlines, nearest emergency hospital, location sharing. */
export function EmergencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('emergency.title')}
      side={wide ? 'right' : 'bottom'}
    >
      {open && <EmergencyContent />}
    </Sheet>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-2 text-sm font-semibold">{children}</h3>;
}

function EmergencyContent() {
  const { t } = useLocale();
  const geo = useGeolocation();
  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t('emergency.callTitle')}>
        <p className="mb-3 text-sm text-brand-muted">{t('emergency.body')}</p>
        <EmergencyNumbers layout="sheet" />
      </section>

      <section aria-labelledby="emergency-nearest">
        <h3 id="emergency-nearest" className="mb-2 text-sm font-semibold">
          {t('emergency.nearestTitle')}
        </h3>
        <NearestHospital position={geo.position} />
      </section>

      <section aria-labelledby="emergency-location">
        <h3 id="emergency-location" className="mb-2 text-sm font-semibold">
          {t('emergency.locationTitle')}
        </h3>
        <ShareLocation status={geo.status} position={geo.position} onLocate={geo.locate} />
      </section>

      <section>
        <SectionTitle>{t('emergency.whatToDoTitle')}</SectionTitle>
        <ul className="flex flex-col gap-2">
          {WHAT_TO_DO.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-risk-low"
              />
              {t(`emergency.whatToDo.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer />
    </div>
  );
}

function NearestHospital({ position }: { position: [number, number] | null }) {
  const { t, l, n } = useLocale();
  const { divisionId } = useDivision();
  const hospitals = useHospitals();
  const divisions = useDivisions();
  const divisionCenter = divisions.data?.find((d) => d.divisionId === divisionId)?.center ?? null;
  const nearest = useMemo(
    () =>
      hospitals.data
        ? nearestEmergencyHospital(
            hospitals.data.map((s) => s.hospital),
            { divisionId, divisionCenter, position },
          )
        : null,
    [hospitals.data, divisionId, divisionCenter, position],
  );

  return (
    <QueryState
      query={hospitals}
      compact
      skeleton={
        <SkeletonGroup className="rounded-2xl bg-brand-canvas p-4">
          <Skeleton shape="text" className="w-2/3" />
          <Skeleton shape="text" className="mt-2 w-1/2" />
          <Skeleton shape="rect" className="mt-3 h-11" />
        </SkeletonGroup>
      }
      isEmpty={() => nearest === null}
      empty={
        <EmptyState
          compact
          icon={HospitalIcon}
          title={t('emergency.nearestEmptyTitle')}
          message={t('emergency.nearestEmptyMessage')}
          className="rounded-2xl bg-brand-canvas"
        />
      }
    >
      {() => {
        if (!nearest) return null;
        const { hospital, distanceKm } = nearest;
        const name = l(hospital.name);
        return (
          <div className="rounded-2xl bg-brand-canvas p-4">
            <div className="flex items-start gap-3">
              <IconChip icon={HospitalIcon} tone="lime" />
              <div className="min-w-0">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-brand-muted">{l(hospital.address)}</p>
                <p className="mt-1 text-xs text-brand-muted">
                  {distanceKm === null
                    ? t('emergency.inDivision')
                    : t('emergency.kmAway', { km: n(distanceKm, { maximumFractionDigits: 1 }) })}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`tel:${hospital.phone}`}
                aria-label={t('hospitals.callLabel', { name })}
                className={buttonClasses({ variant: 'dark', size: 'sm', fullWidth: true })}
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                {t('hospitals.call')}
              </a>
              <a
                href={directionsUrl(hospital.location)}
                target="_blank"
                rel="noreferrer"
                aria-label={t('hospitals.directionsLabel', { name })}
                className={buttonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })}
              >
                <Navigation aria-hidden="true" className="h-4 w-4" />
                {t('hospitals.directions')}
              </a>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}

function ShareLocation({
  status,
  position,
  onLocate,
}: {
  status: GeoStatus;
  position: [number, number] | null;
  onLocate: () => void;
}) {
  const { t, n } = useLocale();
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const url = position ? locationUrl(position) : null;

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        leadingIcon={LocateFixed}
        loading={status === 'locating'}
        onClick={onLocate}
        fullWidth
      >
        {status === 'locating' ? t('emergency.locating') : t('emergency.shareLocation')}
      </Button>
      <div aria-live="polite">
        {(status === 'denied' || status === 'unavailable') && (
          <p role="alert" className="rounded-2xl bg-[#FCF0D6] p-3 text-sm text-[#6B4A06]">
            {status === 'denied'
              ? t('emergency.locationDenied')
              : t('emergency.locationUnavailable')}
          </p>
        )}
        {status === 'found' && position && url && (
          <div className="rounded-2xl bg-brand-lime-soft p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {t('emergency.locationFound', {
                lat: n(position[0], { maximumFractionDigits: 4 }),
                lng: n(position[1], { maximumFractionDigits: 4 }),
              })}
            </p>
            <p className="mt-1 text-brand-ink/80">{t('emergency.locationHint')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonClasses({ variant: 'secondary', size: 'sm' }), 'bg-white')}
              >
                <MapPin aria-hidden="true" className="h-4 w-4" />
                {t('emergency.openMap')}
              </a>
              {canShare && (
                <Button
                  size="sm"
                  variant="dark"
                  leadingIcon={Share2}
                  onClick={() => {
                    navigator
                      .share({
                        title: t('emergency.shareTitle'),
                        text: t('emergency.shareText'),
                        url,
                      })
                      .catch(() => {
                        // user cancelled the share sheet
                      });
                  }}
                >
                  {t('emergency.share')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
