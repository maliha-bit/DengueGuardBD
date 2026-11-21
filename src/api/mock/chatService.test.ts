import { describe, expect, it } from 'vitest';
import bn from '@/locales/bn.json';
import en from '@/locales/en.json';
import type { ChatContext } from '../types';
import { CHAT_KNOWLEDGE } from './chatKnowledge';
import { answerQuestion, detectIntent, matchKnowledge } from './chatService';
import { divisions, doctors, hospitals, labs } from './seed';

const ctx: ChatContext = { divisionId: 'dhaka', uiLang: 'en' };
const data = {
  divisions,
  hospitals: hospitals.map((hospital) => ({
    hospital,
    beds: {
      hospitalId: hospital.hospitalId,
      generalTotal: 100,
      generalAvailable: hospital.hospitalId.length,
      icuTotal: 10,
      icuAvailable: 2,
      updatedAt: '2026-11-21T06:00:00.000Z',
    },
  })),
  labs,
  doctors,
  listSlots: (doctorId: string, day: string) => [
    {
      slotId: `${doctorId}_${day}`,
      doctorId,
      hospitalId: doctors.find((d) => d.doctorId === doctorId)?.hospitalId ?? '',
      start: `${day}T10:30:00.000Z`,
      capacity: 10,
      booked: 4,
    },
  ],
  days: ['2026-11-22', '2026-11-23'],
};

describe('chat knowledge base', () => {
  it('has about 20 entries, each in English and Bangla with sources', () => {
    expect(CHAT_KNOWLEDGE.length).toBeGreaterThanOrEqual(20);
    for (const entry of CHAT_KNOWLEDGE) {
      expect(entry.answer.en.length).toBeGreaterThan(20);
      expect(entry.answer.bn).toMatch(/[ঀ-৿]/);
      expect(entry.sources.length).toBeGreaterThan(0);
    }
  });

  it.each([
    [en.chatbot.suggestions.symptoms, 'symptoms'],
    [en.chatbot.suggestions.avoid, 'nsaids'],
    [en.chatbot.suggestions.water, 'fluidAmount'],
    [en.chatbot.suggestions.ns1, 'ns1'],
    [bn.chatbot.suggestions.symptoms, 'symptoms'],
    [bn.chatbot.suggestions.avoid, 'nsaids'],
    [bn.chatbot.suggestions.water, 'fluidAmount'],
    ['When should I do the IgM test?', 'antibody'],
    ['Is papaya leaf juice good?', 'papaya'],
  ])('"%s" → %s', (question, id) => {
    expect(matchKnowledge(question)?.id).toBe(id);
  });

  it('English keywords need a word start ("eat" does not match "great")', () => {
    expect(matchKnowledge('That is great')).toBeNull();
  });
});

describe('answerQuestion', () => {
  it('replies in the language the user wrote in', () => {
    const english = answerQuestion('What are dengue symptoms?', { ...ctx, uiLang: 'bn' }, data);
    expect(english.lang).toBe('en');
    expect(english.answer?.text).toMatch(/high fever/);

    const bangla = answerQuestion('ডেঙ্গুর লক্ষণ কী?', ctx, data);
    expect(bangla.lang).toBe('bn');
    expect(bangla.answer?.text).toMatch(/জ্বর/);
  });

  it('returns no answer and no tool for unknown questions (fallback)', () => {
    expect(answerQuestion('Who won the cricket match?', ctx, data)).toEqual({
      lang: 'en',
      answer: null,
      tool: null,
    });
  });

  it('suggests tools from the question', () => {
    expect(detectIntent(en.chatbot.suggestions.beds, false)).toBe('hospitals');
    expect(detectIntent(en.chatbot.suggestions.risk, false)).toBe('risk');
    expect(detectIntent(bn.chatbot.suggestions.risk, false)).toBe('risk');
    expect(detectIntent('Is Sylhet safe?', true)).toBe('risk');
    expect(detectIntent('I want to book an appointment', false)).toBe('booking');

    const labsReply = answerQuestion(en.chatbot.suggestions.ns1, ctx, data);
    expect(labsReply.answer?.answerId).toBe('ns1');
    expect(labsReply.tool).toMatchObject({ kind: 'labs', divisionId: 'dhaka' });
  });

  it('uses a division named in the question', () => {
    const reply = answerQuestion('Hospital beds in Sylhet', ctx, data);
    expect(reply.tool).toMatchObject({ kind: 'hospitals', divisionId: 'sylhet' });
    if (reply.tool?.kind === 'hospitals') {
      expect(reply.tool.hospitalIds.length).toBeGreaterThan(0);
    }
    expect(answerQuestion('চট্টগ্রামে ঝুঁকি কেমন?', ctx, data).tool).toEqual({
      kind: 'risk',
      divisionIds: ['chattogram'],
    });
  });

  it('suggests a doctor and slot for booking, without booking it', () => {
    const reply = answerQuestion('Book an appointment', ctx, data);
    expect(reply.tool?.kind).toBe('booking');
    if (reply.tool?.kind === 'booking') {
      expect(reply.tool.suggestion?.hospital.divisionId).toBe('dhaka');
      expect(reply.tool.suggestion?.slot.slotId).toMatch(/_2026-11-22$/);
    }
  });
});
