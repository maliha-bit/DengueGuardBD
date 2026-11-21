import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { useChatHistory } from '@/api/queries';
import type { ChatContent, ChatFeedback, ChatLang, ChatMessage } from '@/api/types';
import { useDivision } from '@/app/division';
import { useSession } from '@/app/session';
import { detectLanguage } from '@/lib/language';
import { useLocale } from '@/lib/useLocale';
import { getChatSession, setChatSession } from './chatSession';
import { detectRedFlags } from './redFlags';

let nextId = 1;
const makeMessage = (
  role: ChatMessage['role'],
  lang: ChatLang,
  content: ChatContent,
): ChatMessage => ({
  messageId: `m-${Date.now().toString(36)}-${nextId++}`,
  role,
  lang,
  content,
  createdAt: new Date().toISOString(),
});

/**
 * Chat state: red-flag check first, then the chat service. Keeps the conversation for the
 * session and saves it for logged-in users.
 */
export function useChat() {
  const { lang: uiLangRaw } = useLocale();
  const lang: ChatLang = uiLangRaw === 'bn' ? 'bn' : 'en';
  const { divisionId } = useDivision();
  const { isLoggedIn } = useSession();
  const history = useChatHistory(isLoggedIn);
  const [messages, setMessages] = useState<ChatMessage[]>(getChatSession);
  const [pending, setPending] = useState(false);
  const messagesRef = useRef(messages);
  // Bumped by "New chat" so a late reply never lands in the new conversation.
  const generation = useRef(0);

  const commit = useCallback(
    (next: ChatMessage[]) => {
      messagesRef.current = next;
      setChatSession(next);
      setMessages(next);
      if (isLoggedIn) api.saveChatHistory(next).catch(() => undefined);
    },
    [isLoggedIn],
  );

  // Logged-in users: restore the saved chat once, unless this session already has one.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !history.data) return;
    restored.current = true;
    if (history.data.length > 0 && messagesRef.current.length === 0) {
      messagesRef.current = history.data;
      setChatSession(history.data);
      setMessages(history.data);
    }
  }, [history.data]);

  const ask = useCallback(
    async (question: string, base: ChatMessage[]) => {
      const text = question.trim();
      if (!text) return;
      const userLang = detectLanguage(text, lang);
      const userMessage = makeMessage('user', userLang, { type: 'user', text });

      // Safety first: a red flag replaces the answer with the emergency card.
      const flags = detectRedFlags(text);
      if (flags.length > 0) {
        commit([
          ...base,
          userMessage,
          makeMessage('assistant', userLang, { type: 'redFlag', flags }),
        ]);
        return;
      }

      const gen = generation.current;
      commit([...base, userMessage]);
      setPending(true);
      try {
        const reply = await api.sendChatMessage(text, { divisionId, uiLang: lang });
        if (gen !== generation.current) return;
        commit([
          ...messagesRef.current,
          makeMessage('assistant', reply.lang, {
            type: 'reply',
            answer: reply.answer,
            tool: reply.tool,
          }),
        ]);
      } catch {
        if (gen !== generation.current) return;
        commit([
          ...messagesRef.current,
          makeMessage('assistant', userLang, { type: 'error', question: text }),
        ]);
      } finally {
        if (gen === generation.current) setPending(false);
      }
    },
    [commit, divisionId, lang],
  );

  const send = useCallback(
    (text: string) => {
      if (pending) return;
      void ask(text, messagesRef.current);
    },
    [ask, pending],
  );

  /** Retry a failed question: drop the error bubble and its question, then ask again. */
  const retry = useCallback(
    (errorId: string) => {
      const index = messagesRef.current.findIndex((m) => m.messageId === errorId);
      const failed = messagesRef.current[index];
      if (pending || !failed || failed.content.type !== 'error') return;
      void ask(failed.content.question, messagesRef.current.slice(0, Math.max(0, index - 1)));
    },
    [ask, pending],
  );

  const newChat = useCallback(() => {
    generation.current += 1;
    setPending(false);
    messagesRef.current = [];
    setChatSession([]);
    setMessages([]);
    if (isLoggedIn) api.clearChatHistory().catch(() => undefined);
  }, [isLoggedIn]);

  /** Thumbs up/down; pressing the same one again clears it. */
  const rate = useCallback(
    (messageId: string, value: ChatFeedback) => {
      const current = messagesRef.current.find((m) => m.messageId === messageId);
      if (!current) return;
      const feedback = current.feedback === value ? undefined : value;
      commit(messagesRef.current.map((m) => (m.messageId === messageId ? { ...m, feedback } : m)));
      api.sendChatFeedback(messageId, feedback ?? null).catch(() => undefined);
    },
    [commit],
  );

  return {
    messages,
    pending,
    loadingHistory: isLoggedIn && history.isPending && messages.length === 0,
    send,
    retry,
    newChat,
    rate,
  };
}
