import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { AuthorityReport, BreedingReportStatus } from '@/api/types';
import { L } from '@/features/risk/leafletSetup';
import { brandColors } from '@/lib/tokens';
import { useLocale } from '@/lib/useLocale';

const BANGLADESH_CENTER: [number, number] = [23.75, 90.3];

const COLORS: Record<BreedingReportStatus, string> = {
  submitted: brandColors['risk-high'],
  under_review: brandColors['risk-medium'],
  action_taken: brandColors['risk-low'],
  rejected: brandColors.muted,
};

/** Report pins (status in the popup text, not only the colour). Loaded lazily. */
export default function ReportsMapView({
  reports,
  onOpen,
}: {
  reports: AuthorityReport[];
  onOpen: (report: AuthorityReport) => void;
}) {
  const { t } = useLocale();
  const bounds = useMemo(
    () => (reports.length > 1 ? L.latLngBounds(reports.map((r) => r.location)).pad(0.2) : null),
    [reports],
  );
  const center = reports.length === 1 && reports[0] ? reports[0].location : BANGLADESH_CENTER;
  return (
    <MapContainer
      key={reports.map((r) => r.reportId).join(',')}
      center={center}
      zoom={reports.length === 1 ? 13 : 7}
      bounds={bounds ?? undefined}
      className="h-full w-full bg-brand-canvas"
      aria-label={t('staff.reports.mapLabel')}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {reports.map((report) => (
        <CircleMarker
          key={report.reportId}
          center={report.location}
          radius={9}
          pathOptions={{
            color: brandColors.ink,
            weight: 2,
            fillColor: COLORS[report.status],
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <strong>{report.areaName}</strong>
            <br />
            {t(`reports.status.${report.status}`)} · {report.reference}
            <br />
            <button type="button" className="mt-1 underline" onClick={() => onOpen(report)}>
              {t('staff.reports.open')}
            </button>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
