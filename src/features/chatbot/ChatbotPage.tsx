import { useEffect, useRef, useState } from 'react';
import { Bot, Info, MessageSquarePlus, SendHorizontal } from 'lucide-react';
import { Button, Skeleton, SkeletonGroup } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { ChatMessageItem } from './ChatMessageItem';
import { useChat } from './useChat';

export const SUGGESTIONS = ['symptoms', 'avoid', 'water', 'ns1', 'risk', 'beds'] as const;

/** AI chatbot (UC18–UC20). Public; mock answers until the backend is ready. */
export default function ChatbotPage() {
  const { t } = useLocale();
  const chat = useChat();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const appName = t('common.appName');
  const pageTitle = t('chatbot.title');
  useEffect(() => {
    document.title = `${pageTitle} · ${appName}`;
  }, [pageTitle, appName]);

  // Newest message stays in view.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [chat.messages.length, chat.pending]);

  // The input is disabled while waiting; give focus back when the reply arrives.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !chat.pending) inputRef.current?.focus();
    wasPending.current = chat.pending;
  }, [chat.pending]);

  const submit = (text: string) => {
    if (!text.trim() || chat.pending) return;
    chat.send(text);
    setDraft('');
  };

  const empty = chat.messages.length === 0;

  return (
    <section
      aria-labelledby="chatbot-title"
      className="mt-4 flex h-[calc(100dvh-16rem)] min-h-[26rem] flex-col overflow-hidden rounded-3xl bg-white md:mt-6 md:h-[calc(100dvh-9.5rem)]"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-brand-line px-4 py-3 md:px-5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime"
        >
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="chatbot-title" className="truncate text-lg font-semibold">
            {t('chatbot.botName')}
          </h1>
          <p className="flex items-center gap-1 text-xs text-brand-muted">
            <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {t('chatbot.notDiagnosis')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={MessageSquarePlus}
          onClick={() => {
            chat.newChat();
            setDraft('');
            inputRef.current?.focus();
          }}
          disabled={empty && !chat.pending}
        >
          {t('chatbot.newChat')}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto bg-brand-canvas/50 px-3 py-4 md:px-5">
        {chat.loadingHistory ? (
          <SkeletonGroup className="flex flex-col gap-3">
            <Skeleton shape="rect" className="h-16 w-2/3" />
            <Skeleton shape="rect" className="ml-auto h-10 w-1/2" />
          </SkeletonGroup>
        ) : (
          empty && (
            <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime"
              >
                <Bot className="h-7 w-7" />
              </span>
              <h2 className="mt-3 text-xl font-semibold">{t('chatbot.welcomeTitle')}</h2>
              <p className="mt-1 text-sm text-brand-muted">{t('chatbot.welcomeBody')}</p>
              <ul
                aria-label={t('chatbot.suggestionsLabel')}
                className="mt-5 flex flex-wrap justify-center gap-2"
              >
                {SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => submit(t(`chatbot.suggestions.${key}`))}
                      className="min-h-touch rounded-full bg-white px-4 py-2 text-left text-sm font-medium ring-1 ring-inset ring-brand-line hover:bg-brand-lime-soft"
                    >
                      {t(`chatbot.suggestions.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        <ol
          role="log"
          aria-live="polite"
          aria-label={t('chatbot.logLabel')}
          className="flex flex-col gap-4"
        >
          {chat.messages.map((message) => (
            <ChatMessageItem
              key={message.messageId}
              message={message}
              onRate={chat.rate}
              onRetry={chat.retry}
            />
          ))}
        </ol>

        {chat.pending && (
          <div role="status" className="mt-4 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-lime"
            >
              <Bot className="h-4 w-4" />
            </span>
            <span className="flex gap-1 rounded-3xl rounded-tl-md bg-white px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  className="h-2 w-2 animate-bounce rounded-full bg-brand-muted"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="sr-only">{t('chatbot.typing')}</span>
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-brand-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          {t('chatbot.inputLabel')}
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={chat.pending}
          autoComplete="off"
          maxLength={500}
          placeholder={chat.pending ? t('chatbot.waiting') : t('chatbot.placeholder')}
          className="min-h-12 min-w-0 flex-1 rounded-full bg-brand-canvas px-5 text-sm outline-none placeholder:text-brand-muted focus-visible:ring-2 focus-visible:ring-brand-ink disabled:opacity-60"
        />
        <Button
          type="submit"
          iconOnly={SendHorizontal}
          aria-label={t('chatbot.send')}
          disabled={chat.pending || !draft.trim()}
        />
      </form>
    </section>
  );
}
