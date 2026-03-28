'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CirclePlus,
  Loader2,
  RefreshCw,
  SendHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/utils/cn';

type HealthStatus = {
  online: boolean;
  model: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

type ChatReplyPayload = {
  reply?: string;
  sessionId?: string | null;
};

const QUICK_PROMPTS = [
  'How many active users are there?',
  'Show me class performance trends',
  'Which students are at risk?',
  'Summarize recent activity',
];

const normalizeHealth = (payload: Record<string, unknown> | undefined): HealthStatus => ({
  online:
    payload?.ollamaOnline === true ||
    payload?.ollamaAvailable === true,
  model:
    (typeof payload?.model === 'string' && payload.model) ||
    (typeof payload?.configuredModel === 'string' && payload.configuredModel) ||
    'unknown',
});

const formatTime = (value: Date) =>
  value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function buildGreeting(firstName?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `Hello, ${firstName || 'Admin'}! I'm your Nexora AI assistant. I can help you analyze platform data, generate reports, and answer questions about your school system. What would you like to know?`,
    createdAt: new Date(),
  };
}

export default function AdminChatbotPage() {
  const { user } = useAuth();
  const api = useRef(createApiClient()).current;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [healthLoading, setHealthLoading] = useState(true);
  const [health, setHealth] = useState<HealthStatus>({
    online: false,
    model: 'unknown',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    [buildGreeting(user?.firstName)],
  );

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get('/ai/health');
      setHealth(normalizeHealth(data?.data));
    } catch {
      setHealth({ online: false, model: 'unknown' });
    } finally {
      setHealthLoading(false);
    }
  }, [api]);

  useEffect(() => {
    checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => window.clearInterval(interval);
  }, [checkHealth]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  const startNewChat = useCallback(() => {
    setSessionId(null);
    setInput('');
    setMessages([buildGreeting(user?.firstName)]);
    inputRef.current?.focus();
  }, [user?.firstName]);

  const sendMessage = useCallback(
    async (seed?: string) => {
      const content = (seed ?? input).trim();
      if (!content || sending) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages((current) => [...current, userMessage]);
      setInput('');

      if (healthLoading) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Nexora AI is still checking service status. Please try again in a moment.',
            createdAt: new Date(),
          },
        ]);
        return;
      }

      if (!health.online) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Nexora AI is offline right now. Try again when the service is available.',
            createdAt: new Date(),
          },
        ]);
        return;
      }

      try {
        setSending(true);
        const payload: Record<string, string> = { message: content };
        if (sessionId) payload.sessionId = sessionId;
        const { data } = await api.post('/ai/chat', payload);
        const replyData = (data?.data ?? {}) as ChatReplyPayload;
        if (replyData.sessionId) {
          setSessionId(replyData.sessionId);
        }
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: replyData.reply || 'No response returned from the AI service.',
            createdAt: new Date(),
          },
        ]);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to send your message.';
        toast.error(message);
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Warning: ${message}`,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [api, health.online, healthLoading, input, sending, sessionId],
  );

  const statusText = useMemo(() => {
    if (healthLoading) return 'Checking';
    return health.online ? 'AI Online' : 'AI Offline';
  }, [health.online, healthLoading]);

  return (
    <AdminPageShell
      badge="Admin AI Chatbot"
      title="AI Chatbot"
      description="Your intelligent platform assistant"
      icon={Bot}
      actions={(
        <Button className="admin-chatbot-new-chat" onClick={startNewChat}>
          <CirclePlus className="h-4 w-4" />
          New Chat
        </Button>
      )}
    >
      <div className="admin-chatbot-layout">
        <aside className="admin-chatbot-rail">
          <section className="admin-chatbot-panel">
            <h2 className="admin-chatbot-panel-title">Quick Prompts</h2>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="admin-chatbot-prompt"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
          <section className="admin-chatbot-panel">
            <h2 className="admin-chatbot-panel-title">Chat Status</h2>
            <div className="admin-chatbot-status">
              <span
                className={cn(
                  'admin-chatbot-status-dot',
                  health.online && !healthLoading && 'admin-chatbot-status-dot--online',
                )}
              />
              <span>{statusText}</span>
            </div>
          </section>
        </aside>

        <section className="admin-chatbot-workspace">
          <header className="admin-chatbot-workspace-header">
            <div className="flex items-center gap-3">
              <div className="admin-chatbot-brand-icon">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="admin-chatbot-brand-title">Nexora AI</p>
                <p className={cn('admin-chatbot-brand-status', health.online && !healthLoading && 'is-online')}>
                  {healthLoading ? 'Checking model...' : health.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="admin-chatbot-refresh"
              onClick={checkHealth}
              aria-label="Refresh AI status"
            >
              {healthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </header>

          <div ref={scrollRef} className="admin-chatbot-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  'admin-chatbot-message',
                  message.role === 'user' ? 'admin-chatbot-message--user' : 'admin-chatbot-message--assistant',
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="admin-chatbot-message-icon">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : null}
                <div className="admin-chatbot-bubble">
                  <p>{message.content}</p>
                  <time className="admin-chatbot-time">{formatTime(message.createdAt)}</time>
                </div>
              </article>
            ))}
            {sending ? (
              <article className="admin-chatbot-message admin-chatbot-message--assistant">
                <div className="admin-chatbot-message-icon">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="admin-chatbot-bubble">
                  <p className="inline-flex items-center gap-2 text-[var(--admin-text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </p>
                </div>
              </article>
            ) : null}
          </div>

          <footer className="admin-chatbot-input-row">
            <textarea
              ref={inputRef}
              className="admin-chatbot-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything about your platform..."
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              disabled={sending}
            />
            <Button
              size="icon"
              className="admin-chatbot-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </footer>
        </section>
      </div>
    </AdminPageShell>
  );
}
