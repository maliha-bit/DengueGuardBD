/**
 * Brand colour tokens — single source of truth for tailwind.config.ts and the /dev/ui page.
 * Risk colours must always be paired with text + icon (never colour alone).
 */
export const brandColors = {
  ink: '#111111',
  'ink-card': '#1C1C1E',
  sidebar: '#161618',
  canvas: '#E9E9EB',
  card: '#FFFFFF',
  lime: '#D9F26B',
  'lime-soft': '#EEF8C4',
  lavender: '#B9A8F5',
  'lavender-soft': '#E4DDFB',
  muted: '#6B6B70',
  line: '#E2E2E5',
  'risk-low': '#4CAF7A',
  'risk-medium': '#F2B544',
  'risk-high': '#E5484D',
  emergency: '#E5484D',
} as const;

export type BrandColor = keyof typeof brandColors;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
