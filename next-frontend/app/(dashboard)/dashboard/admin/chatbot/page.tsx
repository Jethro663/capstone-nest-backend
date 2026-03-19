'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, History, Loader2, MessageSquare, Plus, Send, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { createApiClient } from '@/lib/api-client';
import { AdminPageShell, AdminSectionCard, AdminStatCard } from '@/components/admin/AdminPageShell';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HealthStatus {
  ollamaOnline: boolean;
  model: string;
}

interface HealthResponseData {
  ollamaOnline?: boolean;
  ollamaAvailable?: boolean;
  model?: string;
  configuredModel?: string;
}

interface HistoryInteraction {
  id: string;
  inputText?: string;
  input_text?: string;
  outputText?: string;
  output_text?: string;
  modelUsed?: string;
  model_used?: string;
  sessionId?: string | null;
  session_id?: string | null;
  sessionType?: string;
  session_type?: string;
  createdAt?: string;
  created_at?: string;
}

interface HistorySession {
  id: string;
  sessionId: string | null;
  title: string;
  preview: string;
  model: string;
  updatedAt: Date;
  turns: number;
  messages: ChatMessage[];
}

const SUGGESTION_CHIPS = [
  'What can you help me with, Ja?',
  'Explain photosynthesis like a detective case',
  'Give me a study plan for math',
  'Quiz me on Philippine history',
];

const normalizeHealth = (payload?: HealthResponseData | null): HealthStatus => ({
  ollamaOnline: payload?.ollamaOnline ?? payload?.ollamaAvailable ?? false,
  model: payload?.model ?? payload?.configuredModel ?? 'unknown',
});

const getInputText = (item: HistoryInteraction) => item.inputText ?? item.input_text ?? '';
const getOutputText = (item: HistoryInteraction) => item.outputText ?? item.output_text ?? '';
const getSessionId = (item: HistoryInteraction) => item.sessionId ?? item.session_id ?? null;
const getSessionType = (item: HistoryInteraction) => item.sessionType ?? item.session_type ?? null;
const getModelUsed = (item: HistoryInteraction) => item.modelUsed ?? item.model_used ?? 'unknown';
const getCreatedAt = (item: HistoryInteraction) => new Date(item.createdAt ?? item.created_at ?? Date.now());

const truncate = (value: string, max = 56) => value.length > max ? `${value.slice(0, max - 3).trimEnd()}...` : value;
const formatTime = (value: Date) => value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatHistoryTime = (value: Date) => value.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function buildHistorySessions(items: HistoryInteraction[]): HistorySession[] {
  const grouped = new Map<string, HistoryInteraction[]>();
  items.forEach((item) => {
    const sessionType = getSessionType(item);
    if (sessionType && sessionType !== 'mentor_chat') return;
    const key = getSessionId(item) ?? item.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
      return;
    }
    grouped.set(key, [item]);
  });

  return Array.from(grouped.entries())
    .map(([key, rows]) => {
      const sortedRows = [...rows].sort((a, b) => getCreatedAt(a).getTime() - getCreatedAt(b).getTime());
      const firstRow = sortedRows[0];
      const updatedAt = getCreatedAt(sortedRows[sortedRows.length - 1]);
      const firstPrompt = getInputText(firstRow).trim();
      const lastReply = getOutputText(sortedRows[sortedRows.length - 1]).trim();
      const messages = sortedRows.flatMap((row) => {
        const timestamp = getCreatedAt(row);
        return [
          { id: `${row.id}-user`, role: 'user' as const, content: getInputText(row), timestamp },
          { id: `${row.id}-assistant`, role: 'assistant' as const, content: getOutputText(row), timestamp },
        ];
      });
      return {
        id: key,
        sessionId: getSessionId(firstRow),
        title: truncate(firstPrompt || 'Untitled chat'),
        preview: truncate(lastReply || firstPrompt || 'No content yet'),
        model: getModelUsed(sortedRows[sortedRows.length - 1]),
        updatedAt,
        turns: sortedRows.length,
        messages,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export default function AdminChatbotPage() {
  const { user } = useAuth();
  const api = useRef(createApiClient()).current;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get('/ai/health');
      setHealth(normalizeHealth(data?.data));
    } catch {
      setHealth({ ollamaOnline: false, model: 'unknown' });
    } finally {
      setHealthLoading(false);
    }
  }, [api]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await api.get('/ai/history');
      const items = Array.isArray(data?.data) ? data.data : [];
      setHistorySessions(buildHistorySessions(items));
    } catch {
      setHistorySessions([]);
      setHistoryError('Failed to load chat history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);

  useEffect(() => {
    checkHealth();
    fetchHistory();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth, fetchHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!selectedHistoryId) return;
    const selectedSession = historySessions.find((item) => item.id === selectedHistoryId);
    if (!selectedSession) return;
    setMessages(selectedSession.messages);
    setSessionId(selectedSession.sessionId);
  }, [historySessions, selectedHistoryId]);

  const openHistorySession = useCallback((historySession: HistorySession) => {
    setSelectedHistoryId(historySession.id);
    setSessionId(historySession.sessionId);
    setMessages(historySession.messages);
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const payload: Record<string, string> = { message: content };
      if (sessionId) payload.sessionId = sessionId;
      const { data } = await api.post('/ai/chat', payload);
      const reply = data.data;
      const nextSessionId = reply.sessionId ?? sessionId ?? null;
      if (nextSessionId) {
        setSessionId(nextSessionId);
        setSelectedHistoryId(nextSessionId);
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await fetchHistory();
    } catch (err: unknown) {
      const errorText =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reach Ja. Please try again.';
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Warning: ${errorText}`, timestamp: new Date() }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setSessionId(null);
    setSelectedHistoryId(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <AdminPageShell
      badge="Admin AI Console"
      title="J.A.K.I.P.I.R Testing Console"
      description="The admin chatbot now feels more like part of the admin workspace, with a calmer shell around history, health, and live chat while keeping the same AI endpoints and session flow."
      actions={(
        <>
          {healthLoading ? (
            <span className="admin-chip"><Loader2 className="h-4 w-4 animate-spin" /> Checking...</span>
          ) : health?.ollamaOnline ? (
            <span className="admin-chip"><Wifi className="h-4 w-4" /> {health.model}</span>
          ) : (
            <span className="admin-chip"><WifiOff className="h-4 w-4" /> Offline</span>
          )}
          <Button variant="outline" className="admin-button-outline rounded-xl px-4 font-black" onClick={startNewChat}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </>
      )}
      stats={(
        <>
          <AdminStatCard label="Saved Sessions" value={historySessions.length} caption="Available in chat history" icon={History} accent="emerald" />
          <AdminStatCard label="Current Messages" value={messages.length} caption={sessionId ? 'Inside the open session' : 'No active session yet'} icon={MessageSquare} accent="sky" />
          <AdminStatCard label="Model" value={health?.model ?? 'unknown'} caption={health?.ollamaOnline ? 'Currently reachable' : 'Not reachable right now'} icon={Bot} accent="amber" />
          <AdminStatCard label="Session State" value={sessionId ? 'Active' : 'Fresh'} caption={selectedHistoryId ? 'History session loaded' : 'Ready for a new prompt'} icon={Plus} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Chat Workspace" description="The AI console is still the same tool underneath, but the outer frame now feels more intentional and easier to use.">
        <div className="grid min-h-[48rem] gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="admin-chat-surface flex min-h-0 flex-col p-0">
            <div className="border-b border-[var(--admin-outline)] px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                <History className="h-4 w-4" />
                Recent Chats
              </div>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Reopen a previous JAKIPIR conversation.</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {historyLoading ? (
                <div className="admin-filter-shell flex items-center gap-2 text-sm text-[var(--admin-text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : historyError ? (
                <div className="admin-filter-shell text-sm text-rose-700">{historyError}</div>
              ) : historySessions.length === 0 ? (
                <div className="admin-filter-shell text-center text-sm text-[var(--admin-text-muted)]">No saved chats yet.</div>
              ) : (
                historySessions.map((historySession) => (
                  <button
                    key={historySession.id}
                    type="button"
                    onClick={() => openHistorySession(historySession)}
                    className={cn('admin-grid-card w-full text-left', selectedHistoryId === historySession.id && 'border-[var(--admin-outline-strong)] bg-emerald-50/60')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--admin-text-strong)]">{historySession.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--admin-text-muted)]">{historySession.preview}</p>
                      </div>
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--admin-text-muted)]">
                      <span>{historySession.turns} turn(s) • {historySession.model}</span>
                      <span>{formatHistoryTime(historySession.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="admin-chat-surface flex min-h-0 flex-col p-0">
            <div className="border-b border-[var(--admin-outline)] bg-white/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[var(--admin-text-strong)]">Ja Admin Console</h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">AI mentor detective for admin-side testing and inspection.</p>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(236,253,245,0.45))] p-6">
              {messages.length === 0 && !sending ? (
                <div className="flex flex-col items-center justify-center gap-6 pt-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Bot className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--admin-text-strong)]">Meet Ja</h3>
                    <p className="mt-1 max-w-md text-sm text-[var(--admin-text-muted)]">
                      Ask a question, pick a suggestion, or reopen a previous session from the admin history rail.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <Button key={chip} variant="outline" size="sm" className="admin-button-outline rounded-xl text-xs font-black" onClick={() => sendMessage(chip)}>
                        {chip}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Bot className="h-4 w-4" />
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-[linear-gradient(135deg,#0f766e,#10b981)] text-white shadow-lg shadow-emerald-900/10'
                        : 'border border-[var(--admin-outline)] bg-white text-foreground shadow-sm',
                    )}
                  >
                    {msg.content}
                    <div className={cn('mt-1 text-[10px]', msg.role === 'user' ? 'text-white/65' : 'text-muted-foreground')}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>

                  {msg.role === 'user' ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-600">
                      {user?.firstName?.[0] ?? 'U'}
                    </div>
                  ) : null}
                </div>
              ))}

              {sending ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl border border-[var(--admin-outline)] bg-white px-4 py-3 shadow-sm">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--admin-outline)] bg-white/75 p-4">
              {sessionId ? <p className="mb-2 text-[10px] text-muted-foreground">Session: {sessionId}</p> : null}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="admin-input flex-1 resize-none rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Type a message for Ja..."
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={(event) => {
                    const element = event.currentTarget;
                    element.style.height = 'auto';
                    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
                  }}
                  disabled={sending}
                />
                <Button size="icon" className="admin-button-solid h-11 w-11 rounded-xl" onClick={() => sendMessage()} disabled={!input.trim() || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
