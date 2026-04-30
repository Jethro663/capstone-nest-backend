'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CirclePlus,
  Loader2,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminAnalyticsChatChart } from '@/components/admin/AdminAnalyticsChatChart';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { adminChatbotService } from '@/services/admin-chatbot-service';
import type {
  AdminAnalyticsHealthStatus,
  AdminAnalyticsHistorySummary,
  AdminAnalyticsSessionMessage,
  AdminAnalyticsSource,
} from '@/types/admin-chatbot';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/utils/cn';
import styles from './admin-chatbot.module.css';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  chart?: AdminAnalyticsSessionMessage['chart'];
  sources?: AdminAnalyticsSource[];
  kind?: 'greeting' | 'chat';
};

const QUICK_PROMPTS = [
  'Give me a class-by-class risk snapshot.',
  'Summarize weekly system usage.',
  'Which interventions need attention this week?',
  'Show evaluation pass rate trends.',
  'Flag any recent audit anomalies.',
];

const formatTime = (value: Date) =>
  value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function toDate(value?: string | Date | null) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) return new Date(value);
  return new Date();
}

function buildGreeting(firstName?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `Hello, ${firstName || 'Admin'}. Ask for trends, risk signals, audit patterns, evaluation summaries, or usage snapshots and I'll stay grounded to the admin analytics data available in Nexora.`,
    createdAt: new Date(),
    kind: 'greeting',
    sources: [],
  };
}

function toChatMessage(message: AdminAnalyticsSessionMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: toDate(message.createdAt),
    chart: message.chart ?? null,
    sources: message.sources ?? [],
    kind: 'chat',
  };
}

function truncateText(value: string, max = 54) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function buildSummaryFromMessages(
  conversationId: string,
  sessionId: string | null,
  messages: ChatMessage[],
): AdminAnalyticsHistorySummary | null {
  const transcript = messages.filter((message) => message.kind !== 'greeting');
  if (!transcript.length) return null;

  const firstUser = transcript.find((message) => message.role === 'user');
  const lastMessage = transcript[transcript.length - 1];

  return {
    sessionId: sessionId ?? conversationId,
    title: truncateText(firstUser?.content || 'Admin analytics chat'),
    preview: `Latest: ${truncateText(lastMessage?.content || 'No preview available', 80)}`,
    updatedAt: lastMessage.createdAt.toISOString(),
  };
}

function upsertHistorySummary(
  summaries: AdminAnalyticsHistorySummary[],
  nextSummary: AdminAnalyticsHistorySummary | null,
) {
  if (!nextSummary) return summaries;

  const filtered = summaries.filter(
    (summary) => summary.sessionId !== nextSummary.sessionId,
  );

  return [nextSummary, ...filtered].sort(
    (left, right) =>
      toDate(right.updatedAt).getTime() - toDate(left.updatedAt).getTime(),
  );
}

function renderSourceFilters(filters: Record<string, unknown>) {
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );
  if (!entries.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={`${key}-${String(value)}`}
          className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] text-[var(--admin-text-muted)]"
        >
          {key}: {String(value)}
        </span>
      ))}
    </div>
  );
}

export default function AdminChatbotPage() {
  const { user, loading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [healthLoading, setHealthLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<AdminAnalyticsHealthStatus>({
    online: false,
    model: 'unknown',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [historyItems, setHistoryItems] = useState<
    AdminAnalyticsHistorySummary[]
  >([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildGreeting(user?.firstName),
  ]);
  const isAuthenticated = Boolean(user);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const nextHealth = await adminChatbotService.getHealth();
      setHealth(nextHealth);
      return nextHealth;
    } catch {
      const nextHealth = { online: false, model: 'unknown' };
      setHealth(nextHealth);
      return nextHealth;
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistoryItems(await adminChatbotService.getHistory());
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let active = true;
    const initialize = async () => {
      const nextHealth = await checkHealth();
      if (!active) return;
      if (nextHealth.online) {
        await loadHistory();
      } else {
        setHistoryItems([]);
        setHistoryLoading(false);
      }
    };

    void initialize();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [checkHealth, isAuthenticated, loadHistory, loading, user?.firstName]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending, sessionLoading]);

  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;
    inputElement.style.height = '0px';
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, 220)}px`;
  }, [input]);

  const startNewChat = useCallback(() => {
    setSessionId(null);
    setActiveConversationId(null);
    setInput('');
    setMessages([buildGreeting(user?.firstName)]);
    inputRef.current?.focus();
  }, [user?.firstName]);

  const openConversation = useCallback(
    async (conversation: AdminAnalyticsHistorySummary) => {
      setSessionLoading(true);
      setActiveConversationId(conversation.sessionId);
      setSessionId(conversation.sessionId);
      setInput('');

      try {
        const session = await adminChatbotService.getSession(conversation.sessionId);
        const nextMessages = session.messages.length
          ? session.messages.map(toChatMessage)
          : [buildGreeting(user?.firstName)];
        setMessages(nextMessages);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load the selected conversation.';
        toast.error(message);
        setMessages([buildGreeting(user?.firstName)]);
      } finally {
        setSessionLoading(false);
        inputRef.current?.focus();
      }
    },
    [user?.firstName],
  );

  const sendMessage = useCallback(
    async (seed?: string) => {
      const content = (seed ?? input).trim();
      if (!content || sending || sessionLoading) return;

      const localConversationId =
        activeConversationId ?? `local-${crypto.randomUUID()}`;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
        kind: 'chat',
      };
      const optimisticMessages = [...messages, userMessage];
      setMessages(optimisticMessages);
      setActiveConversationId(localConversationId);
      setInput('');

      if (!healthLoading && !health.online) {
        const offlineMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'Admin analytics is offline right now. Retry once the AI service is available.',
          createdAt: new Date(),
          kind: 'chat',
          sources: [],
        };
        setMessages([...optimisticMessages, offlineMessage]);
        return;
      }

      try {
        setSending(true);
        const response = await adminChatbotService.sendMessage({
          message: content,
          sessionId,
        });

        const nextSessionId = response.sessionId ?? sessionId ?? localConversationId;
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          createdAt: new Date(),
          kind: 'chat',
          chart: response.chart ?? null,
          sources: response.sources ?? [],
        };
        const nextMessages = [...optimisticMessages, assistantMessage];

        setMessages(nextMessages);
        setSessionId(nextSessionId);
        setActiveConversationId(nextSessionId);
        setHistoryItems((current) =>
          upsertHistorySummary(
            current,
            buildSummaryFromMessages(nextSessionId, nextSessionId, nextMessages),
          ),
        );
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to send your message.';
        toast.error(message);
        setMessages([
          ...optimisticMessages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Warning: ${message}`,
            createdAt: new Date(),
            kind: 'chat',
            sources: [],
          },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [
      activeConversationId,
      health.online,
      healthLoading,
      input,
      messages,
      sending,
      sessionId,
      sessionLoading,
    ],
  );

  const statusText = useMemo(() => {
    if (healthLoading) return 'Checking';
    return health.online ? 'AI Online' : 'AI Offline';
  }, [health.online, healthLoading]);

  const transcriptMessages = useMemo(
    () => messages.filter((message) => message.kind !== 'greeting'),
    [messages],
  );

  const activeSummary = useMemo(
    () =>
      historyItems.find(
        (conversation) => conversation.sessionId === activeConversationId,
      ) ?? null,
    [activeConversationId, historyItems],
  );

  const threadTitle = useMemo(() => {
    if (activeSummary?.title) return activeSummary.title;
    const firstPrompt = transcriptMessages.find(
      (message) => message.role === 'user',
    );
    return firstPrompt?.content || 'New admin analytics thread';
  }, [activeSummary?.title, transcriptMessages]);

  const threadSubtitle = useMemo(() => {
    if (transcriptMessages.length > 0) {
      return 'Responses stay grounded to approved admin reports, evaluation data, audit activity, and system analytics.';
    }

    return 'Use this workspace to inspect reports, evaluations, audit events, and platform usage without leaving the dashboard.';
  }, [transcriptMessages.length]);

  return (
    <AdminPageShell
      badge="Admin AI Chatbot"
      title="AI Chatbot"
      description="Grounded analytics assistant for admin-only LMS insights"
      icon={Bot}
      className={styles.adminChatbotPage}
    >
      <div className={cn(styles.adminChatbotRedesign, 'admin-chatbot-app')}>
        <aside className="admin-chatbot-sidebar">
          <div className="admin-chatbot-sidebar-body">
            <section className="admin-chatbot-sidebar-section admin-chatbot-sidebar-section--history">
              <div className="admin-chatbot-sidebar-section-header">
                <div>
                  <p className="admin-chatbot-section-eyebrow">
                    Recent conversations
                  </p>
                  <h2 className="admin-chatbot-section-title">
                    Recent conversations
                  </h2>
                </div>
                <span className="admin-chatbot-history-count">
                  {historyLoading ? '...' : historyItems.length}
                </span>
              </div>

              {!healthLoading && !health.online ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Admin analytics is offline. History and new answers will resume once the AI service is available.
                </p>
              ) : historyLoading ? (
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Loading admin sessions...
                </p>
              ) : historyItems.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">
                  No saved chats yet. Start a conversation to see it here.
                </p>
              ) : (
                <div className="admin-chatbot-history-list">
                  {historyItems.map((conversation) => (
                    <button
                      key={conversation.sessionId}
                      type="button"
                      className={cn(
                        'admin-chatbot-history-item',
                        activeConversationId === conversation.sessionId &&
                          'is-active',
                      )}
                      onClick={() => openConversation(conversation)}
                    >
                      <div className="admin-chatbot-history-header">
                        <p className="admin-chatbot-history-title">
                          {conversation.title}
                        </p>
                        <time className="admin-chatbot-history-time">
                          {formatTime(toDate(conversation.updatedAt))}
                        </time>
                      </div>
                      <p className="admin-chatbot-history-preview">
                        {conversation.preview}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-chatbot-sidebar-section">
              <div className="admin-chatbot-sidebar-section-header">
                <div>
                  <p className="admin-chatbot-section-eyebrow">Suggested asks</p>
                  <h2 className="admin-chatbot-section-title">Suggested asks</h2>
                </div>
              </div>
              <div className="admin-chatbot-prompt-list space-y-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="admin-chatbot-prompt"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="admin-chatbot-sidebar-footer">
            <div className="admin-chatbot-status">
              <span
                className={cn(
                  'admin-chatbot-status-dot',
                  health.online &&
                    !healthLoading &&
                    'admin-chatbot-status-dot--online',
                )}
              />
              <span>{statusText}</span>
            </div>
            <p className="admin-chatbot-sidebar-meta">Model: {health.model}</p>
            <p className="admin-chatbot-sidebar-meta">
              Answers are constrained to approved admin-facing LMS data sources.
            </p>
          </div>
        </aside>

        <section className="admin-chatbot-stage">
          <header className="admin-chatbot-stage-header">
            <div className="admin-chatbot-stage-copy">
              <p className="admin-chatbot-stage-kicker">
                Admin-only analytics workspace
              </p>
              <h2 className="admin-chatbot-stage-title">{threadTitle}</h2>
              <p className="admin-chatbot-stage-description">
                {threadSubtitle}
              </p>
            </div>

            <div className="admin-chatbot-stage-tools">
              <div className="admin-chatbot-stage-tool-row">
                <div className="admin-chatbot-model-pill">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {healthLoading
                      ? 'Refreshing model status'
                      : `${statusText} - ${health.model}`}
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-chatbot-refresh"
                  onClick={() => void checkHealth()}
                  aria-label="Refresh AI status"
                >
                  {healthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button className="admin-chatbot-new-chat" onClick={startNewChat}>
                <CirclePlus className="h-4 w-4" />
                New thread
              </Button>
            </div>
          </header>

          <div ref={scrollRef} className="admin-chatbot-thread">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  'admin-chatbot-message',
                  message.role === 'user'
                    ? 'admin-chatbot-message--user'
                    : 'admin-chatbot-message--assistant',
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="admin-chatbot-message-icon">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="admin-chatbot-message-icon admin-chatbot-message-icon--user">
                    <UserRound className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="admin-chatbot-bubble">
                  <div className="admin-chatbot-message-meta">
                    <span className="admin-chatbot-message-author">
                      {message.role === 'assistant'
                        ? 'Nexora Admin Analytics'
                        : 'You'}
                    </span>
                    <time className="admin-chatbot-time">
                      {formatTime(message.createdAt)}
                    </time>
                  </div>

                  <p>{message.content}</p>

                  {message.kind === 'greeting' ? (
                    <div className="admin-chatbot-tag-row">
                      <span className="admin-chatbot-tag admin-chatbot-tag--green">
                        Read-only
                      </span>
                      <span className="admin-chatbot-tag admin-chatbot-tag--blue">
                        Grounded sources
                      </span>
                    </div>
                  ) : null}

                  {message.chart ? (
                    <AdminAnalyticsChatChart chart={message.chart} />
                  ) : null}

                  {message.sources && message.sources.length > 0 ? (
                    <div className="admin-chatbot-source-block">
                      <p className="admin-chatbot-source-heading">Sources</p>
                      <div className="mt-2 space-y-2">
                        {message.sources.map((source, index) => (
                          <div
                            key={`${source.source}-${index}`}
                            className="admin-chatbot-source-card"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[var(--admin-text-primary)]">
                                {source.source}
                              </span>
                              {source.window ? (
                                <span className="admin-chatbot-source-window">
                                  {source.window}
                                </span>
                              ) : null}
                            </div>
                            {renderSourceFilters(source.filters)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            {!healthLoading && !health.online && transcriptMessages.length === 0 ? (
              <div className="admin-chatbot-empty-state">
                <div className="admin-chatbot-empty-icon">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p>
                  AI service is currently offline.
                  <br />
                  Reconnect it to continue grounded admin analytics.
                </p>
              </div>
            ) : null}

            {sending || sessionLoading ? (
              <article className="admin-chatbot-message admin-chatbot-message--assistant">
                <div className="admin-chatbot-message-icon">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="admin-chatbot-bubble">
                  <div className="admin-chatbot-message-meta">
                    <span className="admin-chatbot-message-author">
                      Nexora Admin Analytics
                    </span>
                  </div>
                  <p className="inline-flex items-center gap-2 text-[var(--admin-text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {sessionLoading ? 'Loading conversation...' : 'Thinking...'}
                  </p>
                </div>
              </article>
            ) : null}
          </div>

          <footer className="admin-chatbot-composer">
            <div className="admin-chatbot-composer-shell">
              <textarea
                ref={inputRef}
                className="admin-chatbot-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about reports, evaluations, audit events, or usage trends..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                disabled={sending || sessionLoading}
              />

              <div className="admin-chatbot-composer-bar">
                <div className="admin-chatbot-composer-hints">
                  <span className="admin-chatbot-hint-pill">
                    <ShieldCheck className="h-3 w-3" />
                    Admin only
                  </span>
                  <span className="admin-chatbot-hint-pill">
                    <Sparkles className="h-3 w-3" />
                    Grounded sources
                  </span>
                  <span className="admin-chatbot-hint-pill">
                    Read-only analytics
                  </span>
                </div>

                <Button
                  className="admin-chatbot-send"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending || sessionLoading}
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </AdminPageShell>
  );
}
