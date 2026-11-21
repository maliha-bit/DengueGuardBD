import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  FlaskConical,
  Hospital as HospitalIcon,
  Map as MapIcon,
  Navigation,
  Phone,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDivisions, useHospitals, useLabs, useLatestForecast } from '@/api/queries';
import type { ChatTool, DivisionId } from '@/api/types';
import { QueryState } from '@/components/QueryState';
import { RiskBadge } from '@/components/RiskBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import {
  Badge,
  Button,
  buttonClasses,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonGroup,
} from '@/components/ui';
import { BookingFlow } from '@/features/hospitals/BookingFlow';
import { buildDivisionRisks, sortByRisk } from '@/features/risk/riskUtils';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { useLocale } from '@/lib/useLocale';

const smallButton = cn(buttonClasses({ variant: 'secondary', size: 'sm' }), 'bg-white');

function ToolFrame({
  icon: Icon,
  title,
  footer,
  children,
}: {
  icon: LucideIcon;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="mt-3 rounded-2xl bg-brand-canvas p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {title}
      </p>
      {children}
      {footer && <div className="mt-2">{footer}</div>}
    </section>
  );
}

const rowsSkeleton = (
  <SkeletonGroup className="flex flex-col gap-2">
    <Skeleton shape="rect" className="h-16" />
    <Skeleton shape="rect" className="h-16" />
  </SkeletonGroup>
);

function useDivisionName() {
  const { l } = useLocale();
  const divisions = useDivisions();
  return (id: DivisionId) => {
    const division = divisions.data?.find((d) => d.divisionId === id);
    return division ? l(division.name) : id;
  };
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-touch items-center gap-1 rounded-full px-2 text-sm font-medium underline-offset-2 hover:underline"
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

/* ---------- Hospitals with free beds ---------- */

function HospitalsCard({ tool }: { tool: Extract<ChatTool, { kind: 'hospitals' }> }) {
  const { t, l, n } = useLocale();
  const query = useHospitals();
  const divisionName = useDivisionName();
  const title = t('chatbot.tools.hospitalsTitle', { division: divisionName(tool.divisionId) });
  return (
    <ToolFrame
      icon={HospitalIcon}
      title={title}
      footer={
        <FooterLink to={`/hospitals?division=${tool.divisionId}`}>
          {t('chatbot.tools.allHospitals')}
        </FooterLink>
      }
    >
      <QueryState
        query={query}
        compact
        skeleton={rowsSkeleton}
        isEmpty={(all) =>
          !tool.hospitalIds.some((id) => all.some((s) => s.hospital.hospitalId === id))
        }
        empty={<EmptyState compact icon={HospitalIcon} title={t('chatbot.tools.noHospitals')} />}
      >
        {(all) => (
          <ul className="flex flex-col gap-2">
            {tool.hospitalIds.flatMap((id) => {
              const summary = all.find((s) => s.hospital.hospitalId === id);
              if (!summary) return [];
              const { hospital, beds } = summary;
              const name = l(hospital.name);
              return [
                <li key={id} className="rounded-2xl bg-white p-3">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-brand-muted">
                    {t('chatbot.tools.beds', {
                      general: n(beds.generalAvailable),
                      icu: n(beds.icuAvailable),
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={`tel:${hospital.phone}`}
                      aria-label={t('hospitals.callLabel', { name })}
                      className={smallButton}
                    >
                      <Phone aria-hidden="true" className="h-4 w-4" />
                      {t('hospitals.call')}
                    </a>
                    <Link to={`/hospitals/${id}`} className={smallButton}>
                      <Stethoscope aria-hidden="true" className="h-4 w-4" />
                      {t('hospitals.seeDoctors')}
                    </Link>
                  </div>
                </li>,
              ];
            })}
          </ul>
        )}
      </QueryState>
    </ToolFrame>
  );
}

/* ---------- Division risk ---------- */

const TOP_RISK = 3;

function RiskCard({ tool }: { tool: Extract<ChatTool, { kind: 'risk' }> }) {
  const { t, l, n } = useLocale();
  const forecast = useLatestForecast();
  const divisions = useDivisions();
  const rows = useMemo(() => {
    if (!forecast.data || !divisions.data) return [];
    const all = sortByRisk(buildDivisionRisks(forecast.data, divisions.data));
    return tool.divisionIds.length > 0
      ? all.filter((r) => tool.divisionIds.includes(r.division.divisionId))
      : all.slice(0, TOP_RISK);
  }, [forecast.data, divisions.data, tool.divisionIds]);

  const title =
    tool.divisionIds.length > 0 ? t('chatbot.tools.riskTitle') : t('chatbot.tools.riskTopTitle');

  let body: ReactNode;
  if (forecast.isPending || divisions.isPending) body = rowsSkeleton;
  else if (forecast.isError || divisions.isError) {
    body = (
      <ErrorState
        compact
        retrying={forecast.isFetching || divisions.isFetching}
        onRetry={() => {
          void forecast.refetch();
          void divisions.refetch();
        }}
      />
    );
  } else if (rows.length === 0) {
    body = <EmptyState compact icon={MapIcon} title={t('riskMap.emptyTitle')} />;
  } else {
    body = (
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.division.divisionId} className="rounded-2xl bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto font-medium">{l(row.division.name)}</p>
              <RiskBadge level={row.today.riskLevel} size="sm" />
              <TrendIndicator trend={row.trend} className="py-0.5 text-xs" />
            </div>
            <p className="mt-1 text-sm text-brand-muted">
              {t('riskMap.todayCases', { count: n(row.today.predictedCases) })}
            </p>
            <FooterLink to={`/risk?division=${row.division.divisionId}`}>
              {t('chatbot.tools.viewOnMap')}
            </FooterLink>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ToolFrame icon={MapIcon} title={title}>
      {body}
    </ToolFrame>
  );
}

/* ---------- Labs ---------- */

function LabsCard({ tool }: { tool: Extract<ChatTool, { kind: 'labs' }> }) {
  const { t, l, n } = useLocale();
  const query = useLabs();
  const divisionName = useDivisionName();
  return (
    <ToolFrame
      icon={FlaskConical}
      title={t('chatbot.tools.labsTitle', { division: divisionName(tool.divisionId) })}
      footer={<FooterLink to="/labs">{t('chatbot.tools.allLabs')}</FooterLink>}
    >
      <QueryState
        query={query}
        compact
        skeleton={rowsSkeleton}
        isEmpty={(all) => !tool.labIds.some((id) => all.some((lab) => lab.labId === id))}
        empty={<EmptyState compact icon={FlaskConical} title={t('chatbot.tools.noLabs')} />}
      >
        {(all) => (
          <ul className="flex flex-col gap-2">
            {tool.labIds.flatMap((id) => {
              const lab = all.find((x) => x.labId === id);
              if (!lab) return [];
              const name = l(lab.name);
              return [
                <li key={id} className="rounded-2xl bg-white p-3">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-brand-muted">{l(lab.address)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {lab.tests.map((test) => (
                      <Badge key={test.testId} tone="lavender">
                        {t('chatbot.tools.testPrice', {
                          test: t(`chatbot.tests.${test.code}`),
                          price: n(test.priceBdt),
                        })}
                      </Badge>
                    ))}
                    {lab.homeCollection && (
                      <Badge tone="lime">{t('chatbot.tools.homeCollection')}</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={`tel:${lab.phone}`}
                      aria-label={t('hospitals.callLabel', { name })}
                      className={smallButton}
                    >
                      <Phone aria-hidden="true" className="h-4 w-4" />
                      {t('hospitals.call')}
                    </a>
                    <a
                      href={directionsUrl(lab.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('hospitals.directionsLabel', { name })}
                      className={smallButton}
                    >
                      <Navigation aria-hidden="true" className="h-4 w-4" />
                      {t('hospitals.directions')}
                    </a>
                  </div>
                </li>,
              ];
            })}
          </ul>
        )}
      </QueryState>
    </ToolFrame>
  );
}

/* ---------- Appointment suggestion ---------- */

function BookingCard({ tool }: { tool: Extract<ChatTool, { kind: 'booking' }> }) {
  const { t, l, n, d, lang } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const suggestion = tool.suggestion;

  if (!suggestion) {
    return (
      <ToolFrame icon={CalendarCheck} title={t('chatbot.tools.bookingTitle')}>
        <p className="text-sm">{t('chatbot.tools.noSlots')}</p>
        <FooterLink to={`/hospitals?division=${tool.divisionId}`}>
          {t('chatbot.tools.allHospitals')}
        </FooterLink>
      </ToolFrame>
    );
  }

  const { hospital, doctor, slot } = suggestion;
  return (
    <ToolFrame icon={CalendarCheck} title={t('chatbot.tools.bookingTitle')}>
      <div className="rounded-2xl bg-white p-3">
        <p className="font-medium">{l(doctor.name)}</p>
        <p className="text-sm text-brand-muted">
          {l(doctor.specialty)} · {l(hospital.name)}
        </p>
        <p className="mt-1 text-sm font-medium">
          {d(slot.start, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {formatTime(slot.start, lang)}
        </p>
        <p className="text-xs text-brand-muted">
          {t('booking.placesLeft', {
            left: n(slot.capacity - slot.booked),
            total: n(slot.capacity),
          })}
        </p>
        <p className="mt-2 text-xs text-brand-muted">{t('chatbot.tools.bookingNote')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" leadingIcon={CalendarCheck} onClick={() => setConfirming(true)}>
            {t('chatbot.tools.bookThis')}
          </Button>
          <Link to={`/hospitals/${hospital.hospitalId}`} className={smallButton}>
            {t('chatbot.tools.otherTimes')}
          </Link>
        </div>
      </div>
      <BookingFlow
        hospital={hospital}
        doctor={doctor}
        slot={confirming ? slot : null}
        onClose={() => setConfirming(false)}
      />
    </ToolFrame>
  );
}

export function ToolCard({ tool }: { tool: ChatTool }) {
  switch (tool.kind) {
    case 'hospitals':
      return <HospitalsCard tool={tool} />;
    case 'risk':
      return <RiskCard tool={tool} />;
    case 'labs':
      return <LabsCard tool={tool} />;
    case 'booking':
      return <BookingCard tool={tool} />;
  }
}
