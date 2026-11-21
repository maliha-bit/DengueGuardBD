import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import '@/features/risk/leafletSetup';
import { useLocale } from '@/lib/useLocale';

const DEFAULT_CENTER: [number, number] = [23.78, 90.4];

function ClickToPick({ onPick }: { onPick: (point: [number, number]) => void }) {
  useMapEvents({
    click: (event) => onPick([event.latlng.lat, event.latlng.lng]),
  });
  return null;
}

function FollowValue({ value }: { value: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView(value, Math.max(map.getZoom(), 15));
  }, [map, value]);
  return null;
}

/** Tap the map to drop a pin (loaded lazily). */
export default function LocationPickerMap({
  value,
  onChange,
  center,
}: {
  value: [number, number] | null;
  onChange: (point: [number, number]) => void;
  center?: [number, number];
}) {
  const { t } = useLocale();
  return (
    <MapContainer
      center={value ?? center ?? DEFAULT_CENTER}
      zoom={value ? 15 : 12}
      className="h-full w-full cursor-crosshair bg-brand-canvas"
      aria-label={t('reports.form.mapLabel')}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickToPick onPick={onChange} />
      <FollowValue value={value} />
      {value && <Marker position={value} title={t('reports.form.pin')} />}
    </MapContainer>
  );
}
