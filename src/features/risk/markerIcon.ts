import type { RiskLevel } from '@/api/types';
import { L } from './leafletSetup';

/* Risk icons as inline SVG (paths from lucide, ISC licence) — Leaflet markers need HTML strings. */
const SHIELD =
  'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z';
const ICON_PATHS: Record<RiskLevel, string> = {
  low: `<path d="${SHIELD}"/><path d="m9 12 2 2 4-4"/>`,
  medium:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  high: `<path d="${SHIELD}"/><path d="M12 8v4"/><path d="M12 16h.01"/>`,
};

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Pill marker: risk-coloured icon + division name + risk text,
 * so the map never relies on colour alone.
 */
export function riskMarkerIcon({
  level,
  name,
  riskLabel,
  selected,
  side = 'right',
}: {
  level: RiskLevel;
  name: string;
  riskLabel: string;
  selected: boolean;
  /** Which side of the point the label extends to (avoids overlaps). */
  side?: 'left' | 'right';
}) {
  const svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[level]}</svg>`;
  return L.divIcon({
    className: 'dg-marker-anchor',
    iconSize: [0, 0],
    html: `<span class="dg-marker dg-marker--${level}${side === 'left' ? ' dg-marker--left' : ''}${selected ? ' is-selected' : ''}">
      <span class="dg-marker__icon">${svg}</span>
      <span class="dg-marker__text"><b>${escapeHtml(name)}</b><small>${escapeHtml(riskLabel)}</small></span>
    </span>`,
  });
}
