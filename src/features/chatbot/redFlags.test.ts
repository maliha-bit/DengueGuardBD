import { describe, expect, it } from 'vitest';
import type { RedFlagId } from '@/api/types';
import { detectLanguage, normalizeForMatch } from '@/lib/language';
import { detectRedFlags } from './redFlags';

describe('detectRedFlags', () => {
  it.each<[string, RedFlagId]>([
    // English
    ['My gums are bleeding since morning', 'bleeding'],
    ['There is blood in my stool', 'bleeding'],
    ['She has severe stomach pain', 'bellyPain'],
    ['He keeps vomiting and cannot keep water down', 'vomiting'],
    ['My son is very drowsy and confused', 'drowsiness'],
    ['I have trouble breathing', 'breathing'],
    ['Her hands feel cold and clammy', 'coldSkin'],
    ['My father fainted in the bathroom', 'fainting'],
    ["She hasn't peed since last night", 'lowUrine'],
    // Bangla
    ['আমার মাড়ি দিয়ে রক্ত পড়ছে', 'bleeding'],
    ['বমিতে রক্ত দেখা যাচ্ছে', 'bleeding'],
    ['পেটে তীব্র ব্যথা হচ্ছে', 'bellyPain'],
    ['বাচ্চা বারবার বমি করছে', 'vomiting'],
    ['রোগী খুব ঝিমুনি দিচ্ছে', 'drowsiness'],
    ['আমার শ্বাসকষ্ট হচ্ছে', 'breathing'],
    ['হাত-পা ঠান্ডা হয়ে গেছে', 'coldSkin'],
    ['বাবা অজ্ঞান হয়ে গেছেন', 'fainting'],
    ['সকাল থেকে প্রস্রাব হচ্ছে না', 'lowUrine'],
  ])('"%s" → %s', (text, flag) => {
    expect(detectRedFlags(text)).toContain(flag);
  });

  it('finds several flags in one message', () => {
    expect(detectRedFlags('Bleeding from nose and repeated vomiting')).toEqual([
      'bleeding',
      'vomiting',
    ]);
  });

  it('matches Bangla typed with either form of য়', () => {
    const composed = 'পায়খানায় রক্ত';
    const decomposed = composed.normalize('NFD');
    expect(detectRedFlags(composed)).toEqual(['bleeding']);
    expect(detectRedFlags(decomposed)).toEqual(['bleeding']);
  });

  it.each([
    'What are dengue symptoms?',
    'Where can I get a blood test?',
    'রক্ত পরীক্ষা কোথায় করাব?',
    'How much water should I drink?',
    'কতটুকু পানি খাব?',
  ])('does not flag an ordinary question: "%s"', (text) => {
    expect(detectRedFlags(text)).toEqual([]);
  });
});

describe('detectLanguage', () => {
  it.each<[string, 'en' | 'bn']>([
    ['What are dengue symptoms?', 'en'],
    ['ডেঙ্গুর লক্ষণ কী?', 'bn'],
    ['NS1 পরীক্ষা কোথায় করাব?', 'bn'],
    ['Dhaka তে risk কেমন?', 'en'],
  ])('"%s" → %s', (text, lang) => {
    expect(detectLanguage(text)).toBe(lang);
  });

  it('falls back to the UI language when there are no letters', () => {
    expect(detectLanguage('???', 'bn')).toBe('bn');
    expect(detectLanguage('123', 'en')).toBe('en');
  });

  it('normalises case, spaces and apostrophes', () => {
    expect(normalizeForMatch('  Can’t   STOP ')).toBe("can't stop");
  });
});
