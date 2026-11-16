import { useMemo, useRef } from 'react';
import { AttributionControl, MapContainer, Marker, TileLayer } from 'react-leaflet';
import type { DivisionId } from '@/api/types';
import { riskMeta } from '@/lib/risk';
import { useLocale } from '@/lib/useLocale';
import { riskMarkerIcon } from './markerIcon';
import { RiskLegend } from './RiskLegend';
import type { DivisionRisk } from './riskUtils';

const BANGLADESH_CENTER: [number, number] = [23.75, 90.3];
/** Phones: shift east a little so eastern labels (Sylhet, Chattogram) fit. */
const PHONE_CENTER: [number, number] = [23.75, 90.6];
/** Labels that extend to the left of their point so neighbours do not overlap. */
const LABEL_LEFT = new Set<DivisionId>(['khulna']);
const BANGLADESH_BOUNDS: [[number, number], [number, number]] = [
  [20.2, 87.6],
  [26.9, 93.0],
];
/** After this many failed tiles with none loaded, give up and show the list. */
const TILE_FAILURE_LIMIT = 4;

function tileUrl() {
  // Dev helper: ?tiles=fail simulates a tile outage.
  const fail = new URLSearchParams(window.location.search).get('tiles') === 'fail';
  return fail
    ? 'https://tiles.invalid/{z}/{x}/{y}.png'
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}

export interface RiskMapViewProps {
  items: DivisionRisk[];
  selectedId: DivisionId | null;
  onSelect: (id: DivisionId) => void;
  onTilesFailed: () => void;
}

/** Leaflet map of Bangladesh with one labelled marker per division. Loaded lazily. */
export default function RiskMapView({
  items,
  selectedId,
  onSelect,
  onTilesFailed,
}: RiskMapViewProps) {
  const { t, l } = useLocale();
  const tiles = useRef({ loaded: 0, failed: 0, reported: false });

  const markers = useMemo(
    () =>
      items.map(({ division, today }) => {
        const name = l(division.name);
        const riskLabel = t(riskMeta(today.riskLevel).labelKey);
        return {
          id: division.divisionId,
          position: division.center,
          title: t('riskMap.markerLabel', { division: name, risk: riskLabel }),
          icon: riskMarkerIcon({
            level: today.riskLevel,
            name,
            riskLabel,
            selected: division.divisionId === selectedId,
            side: LABEL_LEFT.has(division.divisionId) ? 'left' : 'right',
          }),
        };
      }),
    [items, selectedId, l, t],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={window.matchMedia('(max-width: 767px)').matches ? PHONE_CENTER : BANGLADESH_CENTER}
        zoom={7}
        minZoom={6}
        maxBounds={BANGLADESH_BOUNDS}
        maxBoundsViscosity={0.8}
        attributionControl={false}
        className="h-full w-full bg-brand-canvas"
        aria-label={t('riskMap.mapLabel')}
      >
        <TileLayer
          url={tileUrl()}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            tileload: () => {
              tiles.current.loaded += 1;
            },
            tileerror: () => {
              const state = tiles.current;
              state.failed += 1;
              if (!state.reported && state.loaded === 0 && state.failed >= TILE_FAILURE_LIMIT) {
                state.reported = true;
                onTilesFailed();
              }
            },
          }}
        />
        <AttributionControl position="topright" prefix={false} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={marker.icon}
            title={marker.title}
            alt={marker.title}
            keyboard
            zIndexOffset={marker.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(marker.id) }}
          />
        ))}
      </MapContainer>
      <RiskLegend className="absolute bottom-4 left-4 z-[1000]" />
    </div>
  );
}
