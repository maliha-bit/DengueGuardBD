/**
 * Mock chat service (UC19–UC20). Picks a knowledge-base answer and/or a "tool" (hospital beds,
 * division risk, labs, appointment suggestion) by keywords. The FastAPI backend will replace
 * this behind the same `sendChatMessage` endpoint. Red flags are checked in the browser
 * before this is ever called.
 */
import { detectLanguage, normalizeForMatch } from '@/lib/language';
import type {
  ChatAnswer,
  ChatContext,
  ChatReply,
  ChatTool,
  Division,
  DivisionId,
  Doctor,
  Hospital,
  HospitalSummary,
  Lab,
  Slot,
} from '../types';
import { CHAT_KNOWLEDGE, type KnowledgeEntry } from './chatKnowledge';

export interface ChatData {
  divisions: Division[];
  hospitals: HospitalSummary[];
  labs: Lab[];
  doctors: Doctor[];
  /** Bookable slots for a doctor on a date (yyyy-mm-dd). */
  listSlots: (doctorId: string, isoDate: string) => Slot[];
  /** The next 7 dates (yyyy-mm-dd), today first. */
  days: string[];
}

/** Tool intents, checked in this order (first match wins). */
const INTENTS: Array<{ kind: ChatTool['kind']; en: string[]; bn: string[] }> = [
  {
    kind: 'booking',
    en: ['book', 'appointment', 'see a doctor', 'serial'],
    bn: ['বুক', 'অ্যাপয়েন্টমেন্ট', 'সিরিয়াল', 'ডাক্তার দেখা'],
  },
  {
    kind: 'hospitals',
    en: ['bed', 'hospital near', 'nearest hospital', 'find a hospital', 'find hospital', 'icu'],
    bn: ['শয্যা', 'বেড', 'হাসপাতাল খুঁজ', 'কাছের হাসপাতাল', 'হাসপাতালের', 'আইসিইউ'],
  },
  {
    kind: 'labs',
    en: ['lab', 'test', 'ns1', 'igm', 'cbc', 'diagnostic'],
    bn: ['ল্যাব', 'পরীক্ষা', 'টেস্ট', 'ডায়াগনস্টিক'],
  },
  {
    kind: 'risk',
    en: ['risk', 'outbreak', 'forecast'],
    bn: ['ঝুঁকি', 'পূর্বাভাস', 'প্রকোপ'],
  },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** English keywords start at a word boundary; Bangla keywords match anywhere. */
function hasKeyword(text: string, keyword: string): boolean {
  const k = normalizeForMatch(keyword);
  if (/^[\x20-\x7e]+$/.test(k)) return new RegExp(`(^|[^a-z0-9])${escapeRegExp(k)}`).test(text);
  return text.includes(k);
}

const countHits = (text: string, keywords: string[]) =>
  keywords.reduce((sum, k) => sum + (hasKeyword(text, k) ? 1 : 0), 0);

export function matchKnowledge(text: string): KnowledgeEntry | null {
  const normalized = normalizeForMatch(text);
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of CHAT_KNOWLEDGE) {
    const score = countHits(normalized, [...entry.keywords.en, ...entry.keywords.bn]);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

/** Division named in the text (English or Bangla), if any. */
export function findDivision(text: string, divisions: Division[]): DivisionId | null {
  const normalized = normalizeForMatch(text);
  const hit = divisions.find(
    (d) => hasKeyword(normalized, d.name.en) || hasKeyword(normalized, d.name.bn),
  );
  return hit?.divisionId ?? null;
}

export function detectIntent(text: string, mentionsDivision: boolean): ChatTool['kind'] | null {
  const normalized = normalizeForMatch(text);
  const intent = INTENTS.find(({ en, bn }) => countHits(normalized, [...en, ...bn]) > 0);
  if (intent) return intent.kind;
  return mentionsDivision ? 'risk' : null;
}

const TOOL_LIST_SIZE = 3;

function buildTool(
  kind: ChatTool['kind'],
  named: DivisionId | null,
  ctx: ChatContext,
  data: ChatData,
): ChatTool {
  const divisionId = named ?? ctx.divisionId;
  switch (kind) {
    case 'risk':
      return { kind, divisionIds: named ? [named] : [] };
    case 'hospitals': {
      const hospitalIds = data.hospitals
        .filter((s) => s.hospital.divisionId === divisionId)
        .sort((a, b) => b.beds.generalAvailable - a.beds.generalAvailable)
        .slice(0, TOOL_LIST_SIZE)
        .map((s) => s.hospital.hospitalId);
      return { kind, divisionId, hospitalIds };
    }
    case 'labs': {
      const labIds = data.labs
        .filter((l) => l.divisionId === divisionId)
        .slice(0, TOOL_LIST_SIZE)
        .map((l) => l.labId);
      return { kind, divisionId, labIds };
    }
    case 'booking':
      return { kind, divisionId, suggestion: suggestSlot(divisionId, data) };
  }
}

/** Earliest free slot with a doctor in the division (hospitals with most beds first). */
function suggestSlot(
  divisionId: DivisionId,
  data: ChatData,
): { hospital: Hospital; doctor: Doctor; slot: Slot } | null {
  const hospitals = data.hospitals
    .filter((s) => s.hospital.divisionId === divisionId)
    .map((s) => s.hospital);
  for (const day of data.days) {
    for (const hospital of hospitals) {
      for (const doctor of data.doctors.filter((d) => d.hospitalId === hospital.hospitalId)) {
        const slot = data.listSlots(doctor.doctorId, day).find((s) => s.booked < s.capacity);
        if (slot) return { hospital, doctor, slot };
      }
    }
  }
  return null;
}

export function answerQuestion(text: string, ctx: ChatContext, data: ChatData): ChatReply {
  const lang = detectLanguage(text, ctx.uiLang);
  const entry = matchKnowledge(text);
  const named = findDivision(text, data.divisions);
  const intent = detectIntent(text, named !== null);
  const answer: ChatAnswer | null = entry
    ? { answerId: entry.id, text: entry.answer[lang], sources: entry.sources }
    : null;
  const tool = intent ? buildTool(intent, named, ctx, data) : null;
  return { lang, answer, tool };
}
