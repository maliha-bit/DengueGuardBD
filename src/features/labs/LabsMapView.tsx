import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { Lab } from '@/api/types';
import { L } from '@/features/risk/leafletSetup';
import { useLocale } from '@/lib/useLocale';

const BANGLADESH_CENTER: [number, number] = [23.75, 90.3];

/** Leaflet map of the filtered labs (loaded lazily, like the risk map). */
export default function LabsMapView({ labs }: { labs: Lab[] }) {
  const { t, l } = useLocale();
  const bounds = useMemo(
    () => (labs.length > 1 ? L.latLngBounds(labs.map((lab) => lab.location)).pad(0.2) : null),
    [labs],
  );
  const center = labs.length === 1 && labs[0] ? labs[0].location : BANGLADESH_CENTER;

  return (
    <MapContainer
      key={labs.map((lab) => lab.labId).join(',')}
      center={center}
      zoom={labs.length === 1 ? 12 : 7}
      bounds={bounds ?? undefined}
      className="h-full w-full bg-brand-canvas"
      aria-label={t('labs.mapLabel')}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {labs.map((lab) => (
        <Marker key={lab.labId} position={lab.location} title={l(lab.name)}>
          <Popup>
            <strong>{l(lab.name)}</strong>
            <br />
            {l(lab.address)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
