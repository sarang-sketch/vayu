/** Assistant chat state machine backed by the Gemini API (or demo engine). */
import { useCallback, useState } from 'react';
import type { ChatTurn } from '@vayusense/shared';
import { api, type ApiMeta } from '../lib/api';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';

export interface ChatMessage extends ChatTurn {
  id: number;
}

interface AssistantState {
  messages: ChatMessage[];
  suggestions: { label: string; prompt: string }[];
  sending: boolean;
  error: string | null;
  meta: ApiMeta | null;
  send: (text: string, aqi?: number) => Promise<void>;
  reset: () => void;
}

let nextId = 1;

export function useAssistant(aqi?: number): AssistantState {
  const persona = useAppStore((s) => s.persona);
  const city = useAppStore((s) => s.city);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<{ label: string; prompt: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);

  const send = useCallback(
    async (text: string, currentAqi?: number) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMessage: ChatMessage = { id: nextId++, role: 'user', text: trimmed };
      const history = [...messages, userMessage]
        .slice(-10)
        .map(({ role, text: t }) => ({ role, text: t }));
      setMessages((prev) => [...prev, userMessage]);
      setSending(true);
      setError(null);

      try {
        const response = await api.chat({
          message: trimmed,
          persona,
          city,
          aqi: currentAqi ?? aqi,
          history: history.slice(0, -1),
        });
        setMessages((prev) => [...prev, { id: nextId++, role: 'model', text: response.reply }]);
        setSuggestions(response.suggestedActions ?? []);
        setMeta(response.meta);
        track('assistant_message', { persona, demo: response.meta.demo });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Assistant unavailable');
      } finally {
        setSending(false);
      }
    },
    [messages, sending, persona, city, aqi],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setMeta(null);
    setError(null);
  }, []);

  return { messages, suggestions, sending, error, meta, send, reset };
}
