/** Gemini chat panel with suggestion chips and streaming-style UX. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { PERSONA_LABELS } from '@vayusense/shared';
import { useAssistant } from '../../hooks/useAssistant';
import { useAppStore } from '../../store/useAppStore';
import { Button, Card, cn } from '../ui';

const STARTER_PROMPTS = [
  'Is it safe for my kids to play outside today?',
  'How do I keep indoor air clean without a purifier?',
  'What is the impact of switching my commute to metro?',
];

export function ChatPanel({ aqi }: { aqi?: number }) {
  const persona = useAppStore((s) => s.persona);
  const { messages, suggestions, sending, error, meta, send, reset } = useAssistant(aqi);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft;
    setDraft('');
    void send(text);
  };

  return (
    <Card className="flex h-[560px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-ink-600/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-300" aria-hidden="true" />
          <h2 className="font-display text-sm font-semibold text-white">VayuSense Assistant</h2>
          <span className="chip">{PERSONA_LABELS[persona]}</span>
        </div>
        <div className="flex items-center gap-2">
          {meta ? (
            <span className="text-xs text-mist-500">{meta.demo ? 'demo engine' : meta.model}</span>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="rounded-lg p-1.5 text-mist-500 hover:bg-ink-700 hover:text-mist-100"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm text-mist-500">
              Ask about smog-safe routines, masks, indoor air, commutes or sustainable swaps.
              Personalized for <strong className="text-mist-100">{PERSONA_LABELS[persona]}</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip hover:border-teal-400/60 hover:text-teal-300"
                  onClick={() => void send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-teal-500/20 text-teal-100'
                    : 'bg-ink-700/70 text-mist-100',
                )}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        {sending ? (
          <div className="flex items-center gap-2 text-sm text-mist-500">
            <Loader2 className="h-4 w-4 animate-spin text-teal-300" aria-hidden="true" />
            Thinking through today&apos;s conditions…
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </div>

      {suggestions.length > 0 && !sending ? (
        <div className="flex flex-wrap gap-2 border-t border-ink-600/60 px-4 py-2">
          {suggestions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="chip hover:border-teal-400/60 hover:text-teal-300"
              onClick={() => void send(action.prompt)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit} className="flex gap-2 border-t border-ink-600/60 p-3">
        <label htmlFor="chat-input" className="sr-only">
          Message the assistant
        </label>
        <input
          id="chat-input"
          className="input"
          placeholder="Ask about today's air…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          autoComplete="off"
        />
        <Button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </Card>
  );
}
