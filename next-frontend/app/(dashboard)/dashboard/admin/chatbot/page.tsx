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
  kind?: 'greeting' | 'chat';
};

type ChatReplyPayload = {
  reply?: string;
  sessionId?: string | null;
};

type ChatHistoryEntry = {
  id?: string;
  sessionId?: string | null;
  inputText?: string | null;
  outputText?: string | null;
  createdAt?: string | null;
  sessionType?: string | null;
};

type ChatHistoryConversation = {
  id: string;
  sessionId: string | null;
  title: string;
  preview: string;
  updatedAt: Date;
  messages: ChatMessage[];
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
    kind: 'greeting',
  };
}

function truncateText(value: string, max = 54) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function buildConversationFromMessages({
  conversationId,
  sessionId,
  messages,
}: {
  conversationId: string;
  sessionId: string | null;
  messages: ChatMessage[];
}): ChatHistoryConversation | null {
  const transcript = messages.filter((message) => message.kind !== 'greeting');
  if (transcript.length === 0) return null;

  const firstUser = transcript.find((message) => message.role === 'user');
  const lastMessage = transcript[transcript.length - 1];

  return {
    id: conversationId,
    sessionId,
    title: truncateText(firstUser?.content || 'New chat'),
    preview: truncateText(lastMessage?.content || 'No messages yet', 72),
    updatedAt: lastMessage?.createdAt ?? new Date(),
    messages: transcript,
  };
}

function upsertConversation(
  conversations: ChatHistoryConversation[],
  nextConversation: ChatHistoryConversation | null,
): ChatHistoryConversation[] {
  if (!nextConversation) return conversations;

  const filtered = conversations.filter(
    (conversation) =>
      conversation.id !== nextConversation.id &&
      !(
        conversation.sessionId &&
        nextConversation.sessionId &&
        conversation.sessionId === nextConversation.sessionId
      ),
  );

  return [nextConversation, ...filtered].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

function normalizeHistoryConversations(payload: unknown): ChatHistoryConversation[] {
  const rows = Array.isArray(payload) ? (payload as ChatHistoryEntry[]) : [];
  const groups = new Map<string, ChatHistoryConversation>();

  for (const row of rows) {
    if (!row) continue;
    if (row.sessionType && row.sessionType !== 'mentor_chat') continue;

    const inputText = row.inputText?.trim();
    const outputText = row.outputText?.trim();
    if (!inputText && !outputText) continue;

    const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
    const groupKey = row.sessionId || row.id || crypto.randomUUID();
    const existing = groups.get(groupKey) ?? {
      id: groupKey,
      sessionId: row.sessionId ?? null,
      title: truncateText(inputText || 'AI conversation'),
      preview: truncateText(outputText || inputText || 'No preview available', 72),
      updatedAt: createdAt,
      messages: [],
    };

    if (inputText) {
      existing.messages.push({
        id: `${groupKey}-user-${existing.messages.length}`,
        role: 'user',
        content: inputText,
        createdAt,
        kind: 'chat',
      });
    }

    if (outputText) {
      existing.messages.push({
        id: `${groupKey}-assistant-${existing.messages.length}`,
        role: 'assistant',
        content: outputText,
        createdAt,
        kind: 'chat',
      });
    }

    existing.preview = truncateText(outputText || inputText || existing.preview, 72);
    existing.updatedAt = createdAt > existing.updatedAt ? createdAt : existing.updatedAt;
    groups.set(groupKey, existing);
  }

  return Array.from(groups.values()).sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<ChatHistoryConversation[]>([]);
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/ai/history');
      setHistoryItems(normalizeHistoryConversations(data?.data ?? data));
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);

  useEffect(() => {
    checkHealth();
    loadHistory();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => window.clearInterval(interval);
  }, [checkHealth, loadHistory]);

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
    setActiveConversationId(null);
    setInput('');
    setMessages([buildGreeting(user?.firstName)]);
    inputRef.current?.focus();
  }, [user?.firstName]);

  const openConversation = useCallback((conversation: ChatHistoryConversation) => {
    setActiveConversationId(conversation.id);
    setSessionId(conversation.sessionId);
    setMessages(conversation.messages.length ? conversation.messages : [buildGreeting(user?.firstName)]);
    setInput('');
    inputRef.current?.focus();
  }, [user?.firstName]);

  const sendMessage = useCallback(
    async (seed?: string) => {
      const content = (seed ?? input).trim();
      if (!content || sending) return;

      const currentConversationId = activeConversationId ?? `local-${crypto.randomUUID()}`;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
        kind: 'chat',
      };
      const userMessages = [...messages, userMessage];
      setMessages(userMessages);
      setActiveConversationId(currentConversationId);
      setInput('');

      if (healthLoading) {
        const pendingMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Nexora AI is still checking service status. Please try again in a moment.',
          createdAt: new Date(),
          kind: 'chat',
        };
        const pendingMessages = [...userMessages, pendingMessage];
        setMessages(pendingMessages);
        setHistoryItems((current) =>
          upsertConversation(
            current,
            buildConversationFromMessages({
              conversationId: currentConversationId,
              sessionId,
              messages: pendingMessages,
            }),
          ),
        );
        return;
      }

      if (!health.online) {
        const offlineMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Nexora AI is offline right now. Try again when the service is available.',
          createdAt: new Date(),
          kind: 'chat',
        };
        const offlineMessages = [...userMessages, offlineMessage];
        setMessages(offlineMessages);
        setHistoryItems((current) =>
          upsertConversation(
            current,
            buildConversationFromMessages({
              conversationId: currentConversationId,
              sessionId,
              messages: offlineMessages,
            }),
          ),
        );
        return;
      }

      try {
        setSending(true);
        const payload: Record<string, string> = { message: content };
        if (sessionId) payload.sessionId = sessionId;
        const { data } = await api.post('/ai/chat', payload);
        const replyData = (data?.data ?? {}) as ChatReplyPayload;
        const nextSessionId = replyData.sessionId ?? sessionId ?? null;
        const nextConversationId = nextSessionId ?? currentConversationId;
        if (nextSessionId) {
          setSessionId(nextSessionId);
        }
        setActiveConversationId(nextConversationId);
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: replyData.reply || 'No response returned from the AI service.',
          createdAt: new Date(),
          kind: 'chat',
        };
        const nextMessages = [...userMessages, assistantMessage];
        setMessages(nextMessages);
        setHistoryItems((current) =>
          upsertConversation(
            current,
            buildConversationFromMessages({
              conversationId: nextConversationId,
              sessionId: nextSessionId,
              messages: nextMessages,
            }),
          ),
        );
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to send your message.';
        toast.error(message);
        const warningMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Warning: ${message}`,
          createdAt: new Date(),
          kind: 'chat',
        };
        const nextMessages = [...userMessages, warningMessage];
        setMessages(nextMessages);
        setHistoryItems((current) =>
          upsertConversation(
            current,
            buildConversationFromMessages({
              conversationId: currentConversationId,
              sessionId,
              messages: nextMessages,
            }),
          ),
        );
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [activeConversationId, api, health.online, healthLoading, input, messages, sending, sessionId],
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="admin-chatbot-panel-title">Chat History</h2>
              <span className="admin-chatbot-history-count">
                {historyLoading ? '...' : historyItems.length}
              </span>
            </div>
            {historyLoading ? (
              <p className="text-sm text-[var(--admin-text-muted)]">Loading recent conversations...</p>
            ) : historyItems.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No saved chats yet. Start a conversation to see it here.</p>
            ) : (
              <div className="admin-chatbot-history-list">
                {historyItems.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={cn(
                      'admin-chatbot-history-item',
                      activeConversationId === conversation.id && 'is-active',
                    )}
                    onClick={() => openConversation(conversation)}
                  >
                    <div className="admin-chatbot-history-header">
                      <p className="admin-chatbot-history-title">{conversation.title}</p>
                      <time className="admin-chatbot-history-time">
                        {formatTime(conversation.updatedAt)}
                      </time>
                    </div>
                    <p className="admin-chatbot-history-preview">{conversation.preview}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
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
