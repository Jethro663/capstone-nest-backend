'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import type {
  StudentTutorBootstrapResponse,
  StudentTutorHistoryItem,
  StudentTutorQuestion,
  StudentTutorRecommendation,
  StudentTutorSessionLogEntry,
  StudentTutorSessionState,
} from '@/types/ai';
import { Button } from '@/components/ui/button';
import {
  StudentActionCard,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { cn } from '@/utils/cn';

type ChatBubble = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string | null;
};

function bubbleTime(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function classLabel(item: StudentTutorBootstrapResponse['classes'][number]) {
  return `${item.subjectName} (${item.subjectCode})`;
}

function buildChatFromSession(messages: StudentTutorSessionLogEntry[]): ChatBubble[] {
  return messages.flatMap((entry) => [
    {
      id: `${entry.id}-user`,
      role: 'user' as const,
      content: entry.userText,
      createdAt: entry.createdAt,
    },
    {
      id: `${entry.id}-assistant`,
      role: 'assistant' as const,
      content: entry.assistantText,
      createdAt: entry.createdAt,
    },
  ]);
}

export default function StudentChatbotPage() {
  const [bootstrap, setBootstrap] = useState<StudentTutorBootstrapResponse | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingRecommendationId, setStartingRecommendationId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionState, setActiveSessionState] = useState<StudentTutorSessionState | null>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [answerInputs, setAnswerInputs] = useState(['', '', '']);
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [loadingHistorySessionId, setLoadingHistorySessionId] = useState<string | null>(null);

  const currentQuestions = activeSessionState?.questions ?? [];

  const fetchBootstrap = useCallback(async (classId?: string, silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await aiService.getStudentTutorBootstrap(classId);
      const payload = res.data;
      setBootstrap(payload);
      setSelectedClassId(payload.selectedClassId ?? payload.classes[0]?.id ?? '');
    } catch {
      toast.error('Failed to load the student chatbot');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setLoadingHistorySessionId(sessionId);
      const res = await aiService.getStudentTutorSession(sessionId);
      setActiveSessionId(res.data.sessionId);
      setActiveSessionState(res.data.state);
      setMessages(buildChatFromSession(res.data.messages));
      setAnswerInputs(['', '', '']);
    } catch {
      toast.error('Failed to open the tutor session');
    } finally {
      setLoadingHistorySessionId(null);
    }
  }, []);

  const activeClass = useMemo(
    () => bootstrap?.classes.find((item) => item.id === selectedClassId) ?? null,
    [bootstrap?.classes, selectedClassId],
  );

  const onSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    setActiveSessionId(null);
    setActiveSessionState(null);
    setMessages([]);
    setAnswerInputs(['', '', '']);
    await fetchBootstrap(classId, true);
  };

  const startRecommendation = async (recommendation: StudentTutorRecommendation) => {
    if (!selectedClassId) return;
    try {
      setStartingRecommendationId(recommendation.id);
      const res = await aiService.startStudentTutorSession(selectedClassId, recommendation);
      setActiveSessionId(res.data.sessionId);
      setActiveSessionState({
        sessionKind: 'student_tutor',
        stage: res.data.stage,
        classId: selectedClassId,
        classLabel: activeClass ? classLabel(activeClass) : selectedClassId,
        recommendation: res.data.recommendation,
        lessonPlan: res.data.lessonPlan,
        lessonBody: res.data.lessonBody,
        questions: res.data.questions,
        citations: res.data.citations,
        round: 1,
        completed: res.data.completed,
        messageType: 'session_start',
      });
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.message,
        },
      ]);
      setAnswerInputs(['', '', '']);
      await fetchBootstrap(selectedClassId, true);
    } catch {
      toast.error('Failed to start the tutoring session');
    } finally {
      setStartingRecommendationId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!activeSessionId || !messageInput.trim() || sendingMessage) return;
    const content = messageInput.trim();
    try {
      setSendingMessage(true);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content },
      ]);
      setMessageInput('');
      const res = await aiService.sendStudentTutorMessage(activeSessionId, content);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.message,
        },
      ]);
      setActiveSessionState((prev) =>
        prev
          ? {
              ...prev,
              stage: res.data.stage,
              completed: res.data.completed,
              questions: res.data.questions,
              citations: res.data.citations,
            }
          : prev,
      );
    } catch {
      toast.error('Failed to send your message to Ja');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!activeSessionId || !currentQuestions.length || submittingAnswers) return;
    const payload = answerInputs.slice(0, currentQuestions.length).map((item) => item.trim());
    if (payload.some((item) => !item)) {
      toast.error('Answer all current practice questions first');
      return;
    }

    try {
      setSubmittingAnswers(true);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: payload.map((value, idx) => `${idx + 1}. ${value}`).join('\n'),
        },
      ]);
      const res = await aiService.submitStudentTutorAnswers(activeSessionId, payload);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.message,
        },
      ]);
      setActiveSessionState((prev) =>
        prev
          ? {
              ...prev,
              stage: res.data.stage,
              completed: res.data.completed,
              questions: res.data.questions,
              round: prev.round + 1,
            }
          : prev,
      );
      setAnswerInputs(['', '', '']);
      await fetchBootstrap(selectedClassId, true);
    } catch {
      toast.error('Failed to evaluate your answers');
    } finally {
      setSubmittingAnswers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--student-accent)]" />
      </div>
    );
  }

  if (!bootstrap?.classes.length) {
    return (
      <div className="student-page rounded-[2rem] p-1">
        <div className="mx-auto max-w-3xl">
          <StudentActionCard className="min-h-[60vh]">
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
                <Bot className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-black text-[var(--student-text-strong)]">
                Ja needs an active class first
              </h1>
              <p className="max-w-xl text-sm text-[var(--student-text-muted)]">
                The chatbot tutor needs at least one active enrolled class with lesson or assessment context before it can recommend a study path.
              </p>
            </div>
          </StudentActionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page rounded-[2rem] p-1">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <StudentActionCard className="overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                    <Sparkles className="h-3 w-3" />
                    AI Tutor
                  </p>
                  <h1 className="text-2xl font-black text-[var(--student-text-strong)]">
                    Ja
                  </h1>
                  <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                    Choose a class and Ja will suggest the top 3 skills to improve next.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                  Class Focus
                </label>
                <select
                  value={selectedClassId}
                  onChange={(event) => onSelectClass(event.target.value)}
                  className="student-input w-full rounded-2xl border px-4 py-3 text-sm"
                >
                  {(bootstrap?.classes ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {classLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              {activeClass && (
                <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                  <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                    {classLabel(activeClass)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                    {activeClass.sectionName || 'Section not set'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeClass.blendedScore !== null && activeClass.blendedScore !== undefined && (
                      <StudentStatusChip tone={activeClass.isAtRisk ? 'danger' : 'success'}>
                        Blended: {activeClass.blendedScore}%
                      </StudentStatusChip>
                    )}
                    {activeClass.thresholdApplied !== null && activeClass.thresholdApplied !== undefined && (
                      <StudentStatusChip tone="info">
                        Threshold: {activeClass.thresholdApplied}%
                      </StudentStatusChip>
                    )}
                  </div>
                </div>
              )}
            </div>
          </StudentActionCard>

          <StudentActionCard>
            <StudentSectionHeader
              title="Saved Sessions"
              subtitle="Reopen a previous tutoring thread for this class."
            />
            <div className="mt-4 space-y-3">
              {(bootstrap?.history ?? []).length === 0 ? (
                <p className="text-sm text-[var(--student-text-muted)]">No tutor sessions yet.</p>
              ) : (
                (bootstrap?.history ?? []).map((item: StudentTutorHistoryItem) => (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() => loadSession(item.sessionId)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      activeSessionId === item.sessionId
                        ? 'border-[var(--student-outline-strong)] bg-[var(--student-accent-soft)]'
                        : 'border-[var(--student-outline)] bg-[var(--student-elevated)] hover:border-[var(--student-outline-strong)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.preview}
                        </p>
                      </div>
                      {loadingHistorySessionId === item.sessionId ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--student-accent)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)]" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--student-text-muted)]">
                      <StudentStatusChip tone={item.completed ? 'success' : 'warning'}>
                        {item.completed ? 'Completed' : item.stage || 'Active'}
                      </StudentStatusChip>
                    </div>
                  </button>
                ))
              )}
            </div>
          </StudentActionCard>

          <StudentActionCard>
            <StudentSectionHeader
              title="Recent Clues"
              subtitle="What Ja uses first before suggesting your next focus."
            />
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--student-accent)]">
                  <BookOpen className="h-3.5 w-3.5" />
                  Lessons
                </p>
                <div className="space-y-2">
                  {(bootstrap?.recentLessons ?? []).slice(0, 3).map((item) => (
                    <div key={item.lessonId} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-2">
                      <p className="text-sm font-medium text-[var(--student-text-strong)]">{item.title}</p>
                    </div>
                  ))}
                  {(bootstrap?.recentLessons ?? []).length === 0 && (
                    <p className="text-sm text-[var(--student-text-muted)]">No recent completed lessons.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--student-accent)]">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Attempts
                </p>
                <div className="space-y-2">
                  {(bootstrap?.recentAttempts ?? []).slice(0, 3).map((item) => (
                    <div key={item.attemptId} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-2">
                      <p className="text-sm font-medium text-[var(--student-text-strong)]">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                        Attempt #{item.attemptNumber} {item.score !== null && item.score !== undefined ? `• ${item.score}%` : ''}
                      </p>
                    </div>
                  ))}
                  {(bootstrap?.recentAttempts ?? []).length === 0 && (
                    <p className="text-sm text-[var(--student-text-muted)]">No recent submitted attempts.</p>
                  )}
                </div>
              </div>
            </div>
          </StudentActionCard>
        </aside>

        <section className="space-y-4">
          <StudentActionCard className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                  <MessageSquare className="h-3 w-3" />
                  Personalized Tutor
                </p>
                <h2 className="mt-1 text-3xl font-black text-[var(--student-text-strong)]">
                  {activeSessionState?.recommendation.title || 'Pick Your Next Improvement Path'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--student-text-muted)]">
                  {activeSessionState?.recommendation.reason ||
                    'Ja reads your class activity, highlights where you are struggling, and turns that into a guided tutoring loop with simpler practice.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeSessionState?.completed ? (
                  <StudentStatusChip tone="success">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Completed
                  </StudentStatusChip>
                ) : activeSessionId ? (
                  <StudentStatusChip tone="warning">In Progress</StudentStatusChip>
                ) : (
                  <StudentStatusChip tone="info">Ready</StudentStatusChip>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="student-button-outline rounded-xl"
                  onClick={() => fetchBootstrap(selectedClassId, true)}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>
          </StudentActionCard>

          {!activeSessionId && (
            <StudentActionCard>
              <StudentSectionHeader
                title="Top 3 Suggested Focus Areas"
                subtitle="Pick the path you want Ja to turn into a lesson and practice round."
              />
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {(bootstrap?.recommendations ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => startRecommendation(item)}
                    className="student-panel student-panel-hover rounded-[1.5rem] p-5 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-[var(--student-text-strong)]">{item.title}</p>
                        <p className="mt-2 text-sm text-[var(--student-text-muted)]">{item.reason}</p>
                      </div>
                      {startingRecommendationId === item.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--student-accent)]" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-[var(--student-accent)]" />
                      )}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--student-accent)]">
                      Start with Ja
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </StudentActionCard>
          )}

          <StudentActionCard className="min-h-[540px]">
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
                      <Bot className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--student-text-strong)]">
                        Ja is ready to help
                      </h3>
                      <p className="mt-2 max-w-xl text-sm text-[var(--student-text-muted)]">
                        Start a recommended path on the left and Ja will turn it into a short lesson, an easier practice round, and supportive feedback until you finish the topic.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
                          <Bot className="h-5 w-5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[78%] rounded-[1.4rem] px-4 py-3 text-sm leading-6 whitespace-pre-wrap',
                          msg.role === 'user'
                            ? 'bg-[var(--student-text-strong)] text-[var(--student-accent-contrast)]'
                            : 'border border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)]',
                        )}
                      >
                        {msg.content}
                        {msg.createdAt && (
                          <div className={cn('mt-2 text-[10px]', msg.role === 'user' ? 'text-white/60' : 'text-[var(--student-text-muted)]')}>
                            {bubbleTime(msg.createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {activeSessionId && currentQuestions.length > 0 && (
                <div className="mt-6 rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--student-text-strong)]">Current practice round</p>
                      <p className="text-xs text-[var(--student-text-muted)]">
                        Answer all {currentQuestions.length} questions and let Ja check your understanding.
                      </p>
                    </div>
                    <StudentStatusChip tone="info">Round {activeSessionState?.round ?? 1}</StudentStatusChip>
                  </div>
                  <div className="mt-4 space-y-4">
                    {currentQuestions.map((question: StudentTutorQuestion, index) => (
                      <div key={question.id} className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-4">
                        <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                          {index + 1}. {question.question}
                        </p>
                        {question.hint && (
                          <p className="mt-2 text-xs text-[var(--student-text-muted)]">Hint: {question.hint}</p>
                        )}
                        <textarea
                          value={answerInputs[index] ?? ''}
                          onChange={(event) =>
                            setAnswerInputs((prev) => {
                              const next = [...prev];
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                          rows={3}
                          className="student-input mt-3 w-full rounded-2xl border px-4 py-3 text-sm"
                          placeholder="Write your answer here"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      className="student-button-solid rounded-xl"
                      onClick={handleSubmitAnswers}
                      disabled={submittingAnswers}
                    >
                      {submittingAnswers ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                      )}
                      Check My Answers
                    </Button>
                  </div>
                </div>
              )}

              {activeSessionId && (
                <div className="mt-4 flex items-end gap-3 border-t border-[var(--student-outline)] pt-4">
                  <textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    rows={2}
                    className="student-input min-h-[56px] flex-1 rounded-2xl border px-4 py-3 text-sm"
                    placeholder="Ask Ja to explain the topic in another way..."
                  />
                  <Button
                    type="button"
                    className="student-button-solid h-12 rounded-2xl px-4"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageInput.trim()}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </StudentActionCard>
        </section>
      </div>
    </div>
  );
}
