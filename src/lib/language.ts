import type { ChatLang } from '@/api/types';

const BANGLA_LETTER = /[ঀ-৿]/g;
const LATIN_LETTER = /[A-Za-z]/g;

/**
 * Language of a typed message: Bangla when it has at least as many Bangla letters as Latin
 * ones ("NS1 টেস্ট কোথায়?" is Bangla). Text with no letters falls back to `fallback`.
 */
export function detectLanguage(text: string, fallback: ChatLang = 'en'): ChatLang {
  const bangla = text.match(BANGLA_LETTER)?.length ?? 0;
  const latin = text.match(LATIN_LETTER)?.length ?? 0;
  if (bangla === 0 && latin === 0) return fallback;
  return bangla >= latin ? 'bn' : 'en';
}

const NUKTA = String.fromCodePoint(0x09bc);
/** [one-code-point form, base letter + nukta] for য়, ড়, ঢ়. */
const NUKTA_PAIRS: Array<[string, string]> = [
  [String.fromCodePoint(0x09df), String.fromCodePoint(0x09af) + NUKTA],
  [String.fromCodePoint(0x09dc), String.fromCodePoint(0x09a1) + NUKTA],
  [String.fromCodePoint(0x09dd), String.fromCodePoint(0x09a2) + NUKTA],
];

/**
 * Bangla letters with a nukta (য়, ড়, ঢ়) can be typed as one code point or two; both become
 * the two-code-point form. Safe to use on regex sources (does not change case).
 */
export function normalizeBangla(text: string): string {
  return NUKTA_PAIRS.reduce((out, [single, pair]) => out.split(single).join(pair), text);
}

/** Lower-case and normalise typed text for keyword matching. */
export function normalizeForMatch(text: string): string {
  return normalizeBangla(text.toLowerCase()).replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}
