import { describe, expect, it } from 'vitest';
import bn from './bn.json';
import en from './en.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const interpolations = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();

// NFR25: the build/test run fails if a translation key is missing.
describe('locales', () => {
  const enFlat = flatten(en);
  const bnFlat = flatten(bn);

  it('bn has every en key', () => {
    expect(Object.keys(enFlat).filter((k) => !(k in bnFlat))).toEqual([]);
  });

  it('en has every bn key', () => {
    expect(Object.keys(bnFlat).filter((k) => !(k in enFlat))).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = [...Object.entries(enFlat), ...Object.entries(bnFlat)]
      .filter(([, v]) => v.trim() === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('uses the same {{placeholders}} in both languages', () => {
    const mismatched = Object.keys(enFlat).filter(
      (k) =>
        JSON.stringify(interpolations(enFlat[k] ?? '')) !==
        JSON.stringify(interpolations(bnFlat[k] ?? '')),
    );
    expect(mismatched).toEqual([]);
  });
});
