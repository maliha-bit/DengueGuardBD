import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import en from '@/locales/en.json';
import { RISK_LEVELS_ASC, riskMeta } from './risk';
import { brandColors } from './tokens';

describe('riskMeta (colour + label mapping)', () => {
  it.each([
    ['low', brandColors['risk-low'], ShieldCheck, 'Low risk', 'risk-low'],
    ['medium', brandColors['risk-medium'], AlertTriangle, 'Medium risk', 'risk-medium'],
    ['high', brandColors['risk-high'], ShieldAlert, 'High risk', 'risk-high'],
  ] as const)('%s → colour, icon, label and badge tone', (level, color, icon, label, tone) => {
    const meta = riskMeta(level);
    expect(meta.color).toBe(color);
    expect(meta.icon).toBe(icon);
    expect(meta.tone).toBe(tone);
    const [, key] = meta.labelKey.split('.') as [string, keyof typeof en.risk];
    expect(en.risk[key]).toBe(label);
  });

  it('ranks high as most severe and lists the legend low → high', () => {
    expect(riskMeta('high').rank).toBeLessThan(riskMeta('medium').rank);
    expect(riskMeta('medium').rank).toBeLessThan(riskMeta('low').rank);
    expect(RISK_LEVELS_ASC).toEqual(['low', 'medium', 'high']);
  });
});
