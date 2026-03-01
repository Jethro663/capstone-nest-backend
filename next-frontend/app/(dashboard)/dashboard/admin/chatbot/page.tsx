/**
 * Admin AI Chatbot — Test JAKIPIR ("Ja") in the admin dashboard.
 *
 * Full-featured chat UI:
 *  - Ollama health badge
 *  - Multi-turn sessions via sessionId
 *  - Typing indicator, auto-scroll, suggestion chips
 *  - Matches Nexora's Tailwind v4 + shadcn-style design
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, Send, Plus, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { createApiClient } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUGGESTION_CHIPS = [
  'What can you help me with, Ja?',
  'Explain photosynthesis like a detective case',
  'Give me a study plan for math',
  'Quiz me on Philippine history',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminChatbotPage() {
  const { user } = useAuth();
  const api = useRef(createApiClient()).current;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  /* ---- Health check -------------------------------------------- */
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get('/ai/health');
      setHealth(data.data);
    } catch {
      setHealth({ ollamaOnline: false, model: 'unknown' });
    } finally {
      setHealthLoading(false);
    }
  }, [api]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  /* ---- Auto-scroll --------------------------------------------- */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  /* ---- Send message -------------------------------------------- */
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const payload: Record<string, string> = { message: content };
      if (sessionId) payload.sessionId = sessionId;

      const { data } = await api.post('/ai/chat', payload);
      const reply = data.data;

      if (reply.sessionId) setSessionId(reply.sessionId);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText =
        err?.response?.data?.message ?? 'Failed to reach Ja. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ ${errorText}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  /* ---- New conversation ---------------------------------------- */
  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    inputRef.current?.focus();
  };

  /* ---- Keyboard ------------------------------------------------ */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---- Render -------------------------------------------------- */
  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">J.A.K.I.P.I.R</h1>
            <p className="text-xs text-muted-foreground">
              AI Mentor Detective — Admin Testing Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ollama status badge */}
          {healthLoading ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </Badge>
          ) : health?.ollamaOnline ? (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <Wifi className="h-3 w-3" /> {health.model}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={startNewChat}>
            <Plus className="mr-1 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-6"
      >
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center gap-6 pt-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Meet Ja 🔍</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                J.A.K.I.P.I.R is your detective-hype-coach AI mentor.
                Ask a question or pick a suggestion below to get started.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <Button
                  key={chip}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {/* Ja avatar */}
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-white text-foreground shadow-sm',
              )}
            >
              {msg.content}
              <div
                className={cn(
                  'mt-1 text-[10px]',
                  msg.role === 'user'
                    ? 'text-primary-foreground/60'
                    : 'text-muted-foreground',
                )}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold uppercase text-gray-600">
                {user?.firstName?.[0] ?? 'U'}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="border-t bg-white p-4">
        {sessionId && (
          <p className="mb-2 text-[10px] text-muted-foreground">
            Session: {sessionId}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Type a message for Ja…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            disabled={sending}
          />
          <Button
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
