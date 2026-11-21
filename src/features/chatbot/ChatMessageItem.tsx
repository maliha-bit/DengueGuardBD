import { useMemo } from 'react';
import {
  BookOpen,
  Bot,
  Copy,
  Hospital,
  Info,
  RotateCw,
  Siren,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ChatFeedback, ChatMessage, ChatTool, RedFlagId } from '@/api/types';
import { useEmergency } from '@/app/emergency';
import { EmergencyNumbers } from '@/components/EmergencyNumbers';
import { Badge, Button, buttonClasses, useToast } from '@/components/ui';
import { NearestHospital } from '@/features/emergency/EmergencySheet';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { ToolCard } from './ToolCards';

/** Translator bound to the message's language (replies follow the language the user wrote in). */
function useMessageT(message: ChatMessage) {
  const { i18n } = useTranslation();
  return useMemo(() => i18n.getFixedT(message.lang), [i18n, message.lang]);
}

/** Plain text of an assistant message, for the Copy button. */
function useCopyText(message: ChatMessage): string | null {
  const tm = useMessageT(message);
  const { content } = message;
  if (content.type !== 'reply') return null;
  if (content.answer) return content.answer.text;
  if (!content.tool) return tm('chatbot.fallback');
  return null;
}

export interface ChatMessageItemProps {
  message: ChatMessage;
  onRate: (messageId: string, value: ChatFeedback) => void;
  onRetry: (messageId: string) => void;
}

export function ChatMessageItem({ message, onRate, onRetry }: ChatMessageItemProps) {
  const { t, lang } = useLocale();
  const time = formatTime(message.createdAt, lang);

  if (message.content.type === 'user') {
    return (
      <li className="flex justify-end gap-2">
        <div className="flex max-w-[85%] flex-col items-end">
          <p className="sr-only">{t('chatbot.you')}</p>
          <p
            lang={message.lang}
            className="whitespace-pre-wrap break-words rounded-3xl rounded-tr-md bg-brand-ink px-4 py-2.5 text-sm text-white"
          >
            {message.content.text}
          </p>
          <time dateTime={message.createdAt} className="mt-1 text-xs text-brand-muted">
            {time}
          </time>
        </div>
        <span
          aria-hidden="true"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-lavender-soft"
        >
          <UserRound className="h-4 w-4" />
        </span>
      </li>
    );
  }

  return (
    <li className="flex gap-2">
      <span
        aria-hidden="true"
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-lime"
      >
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 max-w-[90%] flex-col md:max-w-[75%]">
        <p className="sr-only">{t('chatbot.botName')}</p>
        <AssistantBody message={message} onRetry={onRetry} />
        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-brand-muted">
          <time dateTime={message.createdAt} className="mr-1">
            {time}
          </time>
          {message.content.type !== 'error' && <MessageActions message={message} onRate={onRate} />}
        </div>
      </div>
    </li>
  );
}

function AssistantBody({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry: (messageId: string) => void;
}) {
  const tm = useMessageT(message);
  const { content } = message;

  if (content.type === 'redFlag') return <RedFlagCard flags={content.flags} message={message} />;

  if (content.type === 'error') {
    return (
      <div role="alert" className="rounded-3xl rounded-tl-md bg-white p-4 text-sm">
        <p>{tm('chatbot.error')}</p>
        <Button
          className="mt-2"
          size="sm"
          variant="secondary"
          leadingIcon={RotateCw}
          onClick={() => onRetry(message.messageId)}
        >
          {tm('common.retry')}
        </Button>
      </div>
    );
  }

  if (content.type !== 'reply') return null;
  const { answer, tool } = content;

  return (
    <div lang={message.lang} className="rounded-3xl rounded-tl-md bg-white p-4 text-sm">
      {answer && (
        <>
          <p className="whitespace-pre-wrap leading-relaxed">{answer.text}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={tm('chatbot.sourcesLabel')}>
            {answer.sources.map((source) => (
              <li key={source}>
                <Badge tone="lavender" icon={BookOpen}>
                  {tm(`chatbot.sources.${source}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
      {!answer && tool && <p>{tm(toolIntroKey(tool))}</p>}
      {tool && <ToolCard tool={tool} />}
      {!answer && !tool && (
        <>
          <p>{tm('chatbot.fallback')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/symptoms" className={buttonClasses({ variant: 'dark', size: 'sm' })}>
              <Stethoscope aria-hidden="true" className="h-4 w-4" />
              {tm('chatbot.fallbackSymptoms')}
            </Link>
            <Link to="/hospitals" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              <Hospital aria-hidden="true" className="h-4 w-4" />
              {tm('chatbot.fallbackHospital')}
            </Link>
          </div>
        </>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-muted">
        <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {tm('common.disclaimerShort')}
      </p>
    </div>
  );
}

const toolIntroKey = (tool: ChatTool) =>
  (
    ({
      hospitals: 'chatbot.intro.hospitals',
      risk: 'chatbot.intro.risk',
      labs: 'chatbot.intro.labs',
      booking: 'chatbot.intro.booking',
    }) as const
  )[tool.kind];

function RedFlagCard({ flags, message }: { flags: RedFlagId[]; message: ChatMessage }) {
  const tm = useMessageT(message);
  const { openEmergency } = useEmergency();
  return (
    <section
      lang={message.lang}
      aria-labelledby={`${message.messageId}-title`}
      className="on-dark rounded-3xl rounded-tl-md bg-[#C9353A] p-4 text-white"
    >
      <h2
        id={`${message.messageId}-title`}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <Siren aria-hidden="true" className="h-5 w-5" />
        {tm('chatbot.redFlag.title')}
      </h2>
      <p className="mt-1 text-sm text-white/90">{tm('chatbot.redFlag.body')}</p>
      <p className="mt-2 text-sm font-medium">{tm('chatbot.redFlag.mentioned')}</p>
      <ul className="mt-1 list-inside list-disc text-sm text-white/90">
        {flags.map((flag) => (
          <li key={flag}>{tm(`chatbot.redFlags.${flag}`)}</li>
        ))}
      </ul>
      <div className="mt-3 rounded-2xl bg-white p-3 text-brand-ink">
        <EmergencyNumbers layout="sheet" />
        <Button
          className="mt-2"
          variant="dark"
          fullWidth
          leadingIcon={Siren}
          aria-haspopup="dialog"
          onClick={openEmergency}
        >
          {tm('chatbot.redFlag.openEmergency')}
        </Button>
      </div>
      <div className="mt-3 text-brand-ink">
        <p className="mb-1.5 text-sm font-medium text-white">{tm('emergency.nearestTitle')}</p>
        <NearestHospital position={null} />
      </div>
    </section>
  );
}

function MessageActions({
  message,
  onRate,
}: {
  message: ChatMessage;
  onRate: (messageId: string, value: ChatFeedback) => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const copyText = useCopyText(message);

  const copy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      toast({ tone: 'success', message: t('chatbot.copied') });
    } catch {
      toast({ tone: 'error', message: t('chatbot.copyFailed') });
    }
  };

  const rateButton = (value: ChatFeedback, icon: typeof ThumbsUp, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      iconOnly={icon}
      aria-label={label}
      aria-pressed={message.feedback === value}
      onClick={() => onRate(message.messageId, value)}
      className={cn('h-11 w-11', message.feedback === value && 'bg-brand-lime text-brand-ink')}
    />
  );

  return (
    <>
      {copyText && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly={Copy}
          aria-label={t('chatbot.copy')}
          onClick={copy}
        />
      )}
      {rateButton('up', ThumbsUp, t('chatbot.helpful'))}
      {rateButton('down', ThumbsDown, t('chatbot.notHelpful'))}
    </>
  );
}
