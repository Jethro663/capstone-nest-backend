'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminAnalyticsHistorySummary } from '@/types/admin-chatbot';
import { cn } from '@/utils/cn';

type AdminAssistantHistoryProps = {
  items: AdminAnalyticsHistorySummary[];
  activeSessionId: string | null;
  loading: boolean;
  disabled?: boolean;
  onOpen: (item: AdminAnalyticsHistorySummary) => void;
  onNew: () => void;
  onRename: (sessionId: string, title: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  onClose?: () => void;
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function AdminAssistantHistory({
  items,
  activeSessionId,
  loading,
  disabled = false,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onClose,
}: AdminAssistantHistoryProps) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      `${item.title} ${item.preview}`.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  const saveTitle = async (sessionId: string) => {
    const title = editingTitle.trim();
    if (!title) return;
    setBusyId(sessionId);
    try {
      await onRename(sessionId, title);
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <aside className="admin-assistant-history" aria-label="Conversation history">
      <div className="admin-assistant-history-top">
        <div>
          <p>Admin Assistant</p>
          <h2>Conversations</h2>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close conversations">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="admin-assistant-new"
        onClick={onNew}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        New conversation
      </button>

      <label className="admin-assistant-history-search">
        <Search className="h-3.5 w-3.5" />
        <span className="sr-only">Search conversations</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
        />
      </label>

      <div className="admin-assistant-history-list">
        {loading ? (
          <p className="admin-assistant-history-state">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading conversations
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="admin-assistant-history-state">
            <MessageSquareText className="h-4 w-4" />
            {query ? 'No matching conversations' : 'No saved conversations yet'}
          </p>
        ) : (
          filteredItems.map((item) => (
            <article
              key={item.sessionId}
              className={cn(
                'admin-assistant-history-item',
                item.sessionId === activeSessionId && 'is-active',
              )}
            >
              {editingId === item.sessionId ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTitle(item.sessionId);
                  }}
                >
                  <input
                    aria-label="Conversation title"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <button
                    type="submit"
                    aria-label="Save conversation title"
                    disabled={!editingTitle.trim() || busyId === item.sessionId}
                  >
                    {busyId === item.sessionId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-assistant-history-open"
                    onClick={() => onOpen(item)}
                    disabled={disabled}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.preview}</small>
                    </span>
                    <time>{formatUpdatedAt(item.updatedAt)}</time>
                  </button>
                  <div className="admin-assistant-history-actions">
                    <button
                      type="button"
                      aria-label={`Rename ${item.title}`}
                      onClick={() => {
                        setEditingId(item.sessionId);
                        setEditingTitle(item.title);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${item.title}`}
                      disabled={busyId === item.sessionId}
                      onClick={async () => {
                        setBusyId(item.sessionId);
                        try {
                          await onDelete(item.sessionId);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
