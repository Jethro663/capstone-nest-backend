'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  History,
  Loader2,
  Plus,
  SendHorizontal,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { AdminAssistantHistory } from '@/components/admin/admin-assistant/AdminAssistantHistory';
import { AdminAssistantResponse } from '@/components/admin/admin-assistant/AdminAssistantResponse';
import { AdminAssistantWelcome } from '@/components/admin/admin-assistant/AdminAssistantWelcome';
import { adminChatbotService } from '@/services/admin-chatbot-service';
import type {
  AdminAnalyticsHealthStatus,
  AdminAnalyticsHistorySummary,
  AdminAnalyticsSessionMessage,
  AdminAssistantDraft,
  AdminAssistantTimeRange,
} from '@/types/admin-chatbot';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/utils/cn';
import styles from './admin-chatbot.module.css';

type ChatMessage = Omit<AdminAnalyticsSessionMessage, 'createdAt'> & {
  createdAt: Date;
};

const TIME_RANGE_OPTIONS: Array<{
  value: AdminAssistantTimeRange;
  label: string;
}> = [
  { value: 'current_period', label: 'Current grading period' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'all_available', label: 'All available records' },
];

function toDate(value?: string | Date | null) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toChatMessage(message: AdminAnalyticsSessionMessage): ChatMessage {
  return {
    ...message,
    createdAt: toDate(message.createdAt),
    chart: message.chart ?? null,
    sources: message.sources ?? [],
    dataView: message.dataView ?? null,
    suggestedPrompts: message.suggestedPrompts ?? [],
    action: message.action ?? null,
    scope: message.scope ?? null,
  };
}

function truncateText(value: string, max = 64) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function buildHistorySummary(
  sessionId: string,
  messages: ChatMessage[],
): AdminAnalyticsHistorySummary | null {
  if (!messages.length) return null;
  const firstUserMessage = messages.find((message) => message.role === 'user');
  const lastMessage = messages[messages.length - 1];
  return {
    sessionId,
    title: truncateText(firstUserMessage?.content || 'Admin conversation'),
    preview: truncateText(lastMessage.content, 92),
    updatedAt: lastMessage.createdAt.toISOString(),
    messageCount: messages.length,
  };
}

function upsertHistory(
  items: AdminAnalyticsHistorySummary[],
  item: AdminAnalyticsHistorySummary | null,
) {
  if (!item) return items;
  return [item, ...items.filter((entry) => entry.sessionId !== item.sessionId)];
}

function formatMessageTime(value: Date) {
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminChatbotPage() {
  const { user, loading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [healthLoading, setHealthLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [health, setHealth] = useState<AdminAnalyticsHealthStatus>({
    online: false,
    model: 'unknown',
  });
  const [historyItems, setHistoryItems] = useState<
    AdminAnalyticsHistorySummary[]
  >([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [input, setInput] = useState('');
  const [timeRange, setTimeRange] =
    useState<AdminAssistantTimeRange>('current_period');
  const isAuthenticated = Boolean(user);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const nextHealth = await adminChatbotService.getHealth();
      setHealth(nextHealth);
      return nextHealth;
    } catch {
      const offline = { online: false, model: 'unknown' };
      setHealth(offline);
      return offline;
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
    const interval = window.setInterval(() => void checkHealth(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [checkHealth, isAuthenticated, loadHistory, loading]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending, sessionLoading]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 176)}px`;
  }, [input]);

  const activeTitle = useMemo(
    () =>
      historyItems.find((item) => item.sessionId === activeConversationId)
        ?.title ?? null,
    [activeConversationId, historyItems],
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setActiveConversationId(null);
    setInput('');
    setHistoryOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const openConversation = useCallback(
    async (conversation: AdminAnalyticsHistorySummary) => {
      setSessionLoading(true);
      setSessionId(conversation.sessionId);
      setActiveConversationId(conversation.sessionId);
      setHistoryOpen(false);
      try {
        const session = await adminChatbotService.getSession(conversation.sessionId);
        setMessages(session.messages.map(toChatMessage));
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'The conversation could not be loaded.';
        toast.error(message);
        startNewConversation();
      } finally {
        setSessionLoading(false);
      }
    },
    [startNewConversation],
  );

  const renameConversation = useCallback(
    async (targetSessionId: string, title: string) => {
      try {
        const renamed = await adminChatbotService.renameSession(
          targetSessionId,
          title,
        );
        setHistoryItems((current) =>
          current.map((item) =>
            item.sessionId === renamed.sessionId
              ? { ...item, title: renamed.title }
              : item,
          ),
        );
        toast.success('Conversation renamed.');
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'The conversation could not be renamed.';
        toast.error(message);
        throw error;
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (targetSessionId: string) => {
      if (!window.confirm('Delete this conversation? This cannot be undone.')) {
        return;
      }
      try {
        await adminChatbotService.deleteSession(targetSessionId);
        setHistoryItems((current) =>
          current.filter((item) => item.sessionId !== targetSessionId),
        );
        if (activeConversationId === targetSessionId) {
          startNewConversation();
        }
        toast.success('Conversation deleted.');
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'The conversation could not be deleted.';
        toast.error(message);
        throw error;
      }
    },
    [activeConversationId, startNewConversation],
  );

  const copyDraft = useCallback(async (draft: AdminAssistantDraft) => {
    try {
      await navigator.clipboard.writeText(
        `${draft.title}\n\n${draft.body}\n\nAudience: ${draft.audience}`,
      );
      toast.success('Draft copied. Review it before publishing.');
    } catch {
      toast.error('The draft could not be copied.');
    }
  }, []);

  const sendMessage = useCallback(
    async (seed?: string) => {
      const content = (seed ?? input).trim();
      if (
        !content ||
        sending ||
        sessionLoading ||
        healthLoading ||
        !health.online
      ) {
        return;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };
      const optimisticMessages = [...messages, userMessage];
      setMessages(optimisticMessages);
      setInput('');
      setSending(true);

      try {
        const response = await adminChatbotService.sendMessage({
          message: content,
          sessionId,
          scope: { timeRange },
        });
        const nextSessionId = response.sessionId ?? sessionId;
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          createdAt: new Date(),
          chart: response.chart ?? null,
          sources: response.sources,
          dataView: response.dataView,
          suggestedPrompts: response.suggestedPrompts,
          action: response.action,
          scope: response.scope,
        };
        const nextMessages = [...optimisticMessages, assistantMessage];
        setMessages(nextMessages);

        if (nextSessionId) {
          setSessionId(nextSessionId);
          setActiveConversationId(nextSessionId);
          setHistoryItems((current) =>
            upsertHistory(
              current,
              buildHistorySummary(nextSessionId, nextMessages),
            ),
          );
        }
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Your question could not be sent.';
        toast.error(message);
        setMessages(optimisticMessages);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [
      health.online,
      healthLoading,
      input,
      messages,
      sending,
      sessionId,
      sessionLoading,
      timeRange,
    ],
  );

  const isBusy = sending || sessionLoading;
  const isUnavailable = !healthLoading && !health.online;

  return (
    <AdminPageShell
      badge="System workspace"
      title="Admin Assistant"
      description="Ask questions across approved Nexora records and prepare safe next steps."
      icon={Bot}
      className={styles.adminAssistantPage}
    >
      <div className={cn(styles.adminAssistantApp, 'admin-assistant-app')}>
        <div
          className={cn(
            'admin-assistant-history-shell',
            historyOpen && 'is-open',
          )}
        >
          <AdminAssistantHistory
            items={historyItems}
            activeSessionId={activeConversationId}
            loading={historyLoading}
            disabled={isBusy || isUnavailable}
            onOpen={(item) => void openConversation(item)}
            onNew={startNewConversation}
            onRename={renameConversation}
            onDelete={deleteConversation}
            onClose={() => setHistoryOpen(false)}
          />
        </div>
        {historyOpen ? (
          <button
            type="button"
            className="admin-assistant-backdrop"
            aria-label="Close conversations"
            onClick={() => setHistoryOpen(false)}
          />
        ) : null}

        <main className="admin-assistant-main">
          <header className="admin-assistant-header">
            <div className="admin-assistant-header-title">
              <button
                type="button"
                className="admin-assistant-history-toggle"
                aria-label="Open conversations"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-4 w-4" />
              </button>
              <span className="admin-assistant-brand-mark" aria-hidden="true">
                N
              </span>
              <div>
                <p>Admin Assistant</p>
                <h2>{activeTitle || 'New conversation'}</h2>
              </div>
            </div>

            <div className="admin-assistant-header-controls">
              <label className="admin-assistant-scope-control">
                <span>Scope</span>
                <select
                  aria-label="Data time range"
                  value={timeRange}
                  onChange={(event) =>
                    setTimeRange(event.target.value as AdminAssistantTimeRange)
                  }
                  disabled={isBusy}
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="admin-assistant-header-new"
                onClick={startNewConversation}
                disabled={isBusy}
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            </div>
          </header>

          {isUnavailable ? (
            <div className="admin-assistant-outage" role="alert">
              <WifiOff className="h-4 w-4" />
              <div>
                <strong>Admin Assistant is temporarily unavailable</strong>
                <span>Your saved conversations are safe. Try again when the AI service reconnects.</span>
              </div>
              <button type="button" onClick={() => void checkHealth()}>
                Retry
              </button>
            </div>
          ) : null}

          <div ref={scrollRef} className="admin-assistant-thread">
            {messages.length === 0 && !sessionLoading ? (
              <AdminAssistantWelcome
                firstName={user?.firstName}
                onSelect={(prompt) => void sendMessage(prompt)}
              />
            ) : null}

            {messages.map((message) =>
              message.role === 'user' ? (
                <article
                  key={message.id}
                  className="admin-assistant-message admin-assistant-message--user"
                >
                  <div>
                    <p>{message.content}</p>
                    <time>{formatMessageTime(message.createdAt)}</time>
                  </div>
                </article>
              ) : (
                <article
                  key={message.id}
                  className="admin-assistant-message admin-assistant-message--assistant"
                >
                  <span className="admin-assistant-message-mark" aria-hidden="true">
                    N
                  </span>
                  <div className="admin-assistant-message-content">
                    <div className="admin-assistant-message-meta">
                      <strong>Nexora</strong>
                      <time>{formatMessageTime(message.createdAt)}</time>
                    </div>
                    <AdminAssistantResponse
                      content={message.content}
                      chart={message.chart}
                      sources={message.sources}
                      dataView={message.dataView}
                      suggestedPrompts={message.suggestedPrompts}
                      action={message.action}
                      scope={message.scope}
                      onSuggestedPrompt={(prompt) => void sendMessage(prompt)}
                      onCopyDraft={(draft) => void copyDraft(draft)}
                    />
                  </div>
                </article>
              ),
            )}

            {isBusy ? (
              <article className="admin-assistant-message admin-assistant-message--assistant">
                <span className="admin-assistant-message-mark" aria-hidden="true">
                  N
                </span>
                <div className="admin-assistant-thinking" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {sessionLoading
                    ? 'Opening conversation…'
                    : 'Reviewing the relevant Nexora records…'}
                </div>
              </article>
            ) : null}
          </div>

          <footer className="admin-assistant-composer-area">
            <div className="admin-assistant-composer">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask about people, classes, activity, records, or problems..."
                rows={1}
                disabled={isBusy || isUnavailable}
              />
              <button
                type="button"
                className="admin-assistant-send"
                aria-label="Send message"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isBusy || isUnavailable || healthLoading}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="admin-assistant-composer-note">
              <ShieldCheck className="h-3.5 w-3.5" />
              Read-only evidence and drafts for your review. Official records are never changed silently.
            </p>
          </footer>
        </main>
      </div>
    </AdminPageShell>
  );
}
