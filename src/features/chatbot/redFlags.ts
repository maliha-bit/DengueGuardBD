/**
 * Red-flag safety check (UC18). Runs in the browser BEFORE any question is sent to the chat
 * service: if a message describes a dengue warning sign, the assistant does not answer and
 * shows the emergency card instead. Errs on the side of safety (negations are not parsed).
 */
import type { RedFlagId } from '@/api/types';
import { normalizeBangla, normalizeForMatch } from '@/lib/language';

/** Patterns per flag, English and Bangla. Kept as strings so they can be normalised. */
export const RED_FLAG_PATTERNS: Record<RedFlagId, { en: string[]; bn: string[] }> = {
  bleeding: {
    en: [
      'bleed',
      'blood in (my |the |his |her )?(vomit|stool|poo|urine|spit)',
      'bloody (vomit|stool|poo|nose)',
      'vomit[a-z]* blood',
      'black (stool|poo)',
    ],
    bn: [
      'রক্তক্ষরণ',
      'রক্ত পড়',
      'রক্ত যা',
      'রক্ত আস',
      '(মাড়ি|নাক|বমি|পায়খানা|মল)[^ ]*( দিয়ে| থেকে)? রক্ত',
      'রক্ত[^ ]* বমি',
      'কালো পায়খানা',
    ],
  },
  bellyPain: {
    en: [
      '(severe|bad|strong|terrible|intense|unbearable|sharp) (belly|stomach|abdominal|tummy) ?(pain|ache)',
      '(belly|stomach|abdominal|tummy) ?(pain|ache) (is )?(very )?(severe|bad|unbearable)',
    ],
    bn: [
      'পেটে (তীব্র|প্রচণ্ড|খুব|অনেক|অসহ্য) ব্যথা',
      '(তীব্র|প্রচণ্ড|অসহ্য) পেট ?ব্যথা',
      'পেট ?ব্যথা (খুব|অনেক|প্রচণ্ড)',
    ],
  },
  vomiting: {
    en: [
      "(repeated|repeatedly|keeps?|keep on|constant|nonstop|non-stop|can't stop|cannot stop) ([a-z]+ )?(vomit|throwing up)",
      'vomit[a-z]* (again and again|repeatedly|many times|nonstop|non-stop|all day|every hour)',
      'throwing up (a lot|again and again|many times)',
    ],
    bn: ['বা ?র ?বার বমি', 'অনেকবার বমি', 'বমি থামছে না', 'বমি বন্ধ হচ্ছে না', 'বমি হচ্ছেই'],
  },
  drowsiness: {
    en: [
      'drows',
      'confus',
      'very sleepy',
      'hard to wake',
      'not waking',
      'restless',
      'unconscious',
      'letharg',
    ],
    bn: ['ঝিমুনি', 'ঝিমাচ্ছ', 'অস্থির', 'বিভ্রান্ত', 'অচেতন', 'ঘুম ঘুম', 'জাগানো যাচ্ছে না'],
  },
  breathing: {
    en: [
      "(trouble|difficulty|difficult|hard|problem|can't|cannot) ([a-z]+ )?breath",
      'short(ness)? of breath',
      'breathless',
      'gasping',
    ],
    bn: ['শ্বাসকষ্ট', 'শ্বাস নিতে (কষ্ট|সমস্যা|পারছে না|পারছি না)', 'নিঃশ্বাস নিতে কষ্ট', 'দম বন্ধ'],
  },
  coldSkin: {
    en: ['clammy', 'cold (and )?(sweaty|wet) skin', 'cold (hands|feet|skin)'],
    bn: ['(ঠান্ডা|ঠাণ্ডা)[^ ]* (ও |আর )?(ভেজা|ঘাম)', 'হাত-? ?পা (ঠান্ডা|ঠাণ্ডা)', 'ত্বক (ঠান্ডা|ঠাণ্ডা)'],
  },
  fainting: {
    en: ['faint', 'passed out', 'pass out', 'collaps'],
    bn: ['অজ্ঞান', 'জ্ঞান হারা', 'মাথা ঘুরে পড়'],
  },
  lowUrine: {
    en: [
      '(no|little|less|hardly any|not passing|not much) (urine|pee|peeing|urinat)',
      'not (peeing|urinating)',
      "(haven't|hasn't|didn't|not) (peed|urinated)",
    ],
    bn: ['প্রস্রাব (কম|খুব কম|হচ্ছে না|বন্ধ|হয়নি|হয় নি)', 'প্রস্রাব[^ ]* পরিমাণ কম'],
  },
};

const COMPILED = (
  Object.entries(RED_FLAG_PATTERNS) as Array<[RedFlagId, { en: string[]; bn: string[] }]>
).map(([id, { en, bn }]) => ({
  id,
  patterns: [...en, ...bn].map((source) => new RegExp(normalizeBangla(source), 'iu')),
}));

/** Red flags found in a message (empty = safe to answer). */
export function detectRedFlags(text: string): RedFlagId[] {
  const normalized = normalizeForMatch(text);
  return COMPILED.filter(({ patterns }) => patterns.some((p) => p.test(normalized))).map(
    ({ id }) => id,
  );
}
