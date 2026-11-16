import { describe, expect, it } from 'vitest';
import { formatNumber } from './format';
import { contrastRatio } from './tokens';

describe('formatNumber', () => {
  it('uses Bangla digits for bn', () => {
    expect(formatNumber(62, 'bn')).toBe('৬২');
  });

  it('uses Latin digits for en', () => {
    expect(formatNumber(1200, 'en')).toBe('1,200');
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});
