'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  StudentTutorBootstrapResponse,
  StudentTutorHistoryItem,
  StudentTutorQuestion,
  StudentTutorRecommendation,
  StudentTutorSessionLogEntry,
  StudentTutorSessionState,
} from '@/types/ai';
import { Button } from '@/components/ui/button';
import { StudentEmptyState, StudentSectionHeader, StudentStatusChip } from '@/components/student/student-primitives';
import { StudentPageShell, StudentPageStat, StudentSectionCard } from '@/components/student/StudentPageShell';
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load the student chatbot'));
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to open the tutor session'));
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start the tutoring session'));
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send your message to Ja'));
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to evaluate your answers'));
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
      <StudentPageShell
        badge="AI Study Buddy"
        title="AI Chatbot"
        description="Ja becomes available once you have an active class with lesson or assessment context to learn from."
      >
        <StudentEmptyState
          title="Ja needs an active class first"
          description="The chatbot tutor needs at least one active enrolled class before it can recommend a study path."
          icon={<Bot className="h-5 w-5" />}
        />
      </StudentPageShell>
    );
  }

  const recommendationCount = bootstrap?.recommendations.length ?? 0;
  const historyCount = bootstrap?.history.length ?? 0;

  return (
    <StudentPageShell
      badge="AI Study Buddy"
      title="AI Chatbot"
      description="Talk with Ja in a calmer study space. Pick a class, choose a recommended focus area, and learn step by step without feeling overloaded."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => onSelectClass(event.target.value)}
            className="student-input min-w-[260px] rounded-2xl border px-4 py-3 text-sm"
          >
            {(bootstrap?.classes ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {classLabel(item)}
              </option>
            ))}
          </select>
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
      }
      stats={
        <>
          <StudentPageStat
            label="Class Focus"
            value={activeClass ? activeClass.subjectCode : '--'}
            caption={activeClass?.sectionName || 'Choose a class'}
            icon={BookOpen}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
          />
          <StudentPageStat
            label="Suggestions"
            value={recommendationCount}
            caption="Recommended study paths"
            icon={Sparkles}
            accent="bg-amber-100 text-amber-700"
          />
          <StudentPageStat
            label="Saved Sessions"
            value={historyCount}
            caption="Past tutoring threads"
            icon={MessageSquare}
            accent="bg-sky-100 text-sky-700"
          />
          <StudentPageStat
            label="Status"
            value={activeSessionState?.completed ? 'Done' : activeSessionId ? 'Learning' : 'Ready'}
            caption={activeSessionState?.stage || 'Pick a focus to begin'}
            icon={Bot}
            accent="bg-emerald-100 text-emerald-700"
          />
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <StudentSectionCard
            title={activeSessionState?.recommendation.title || 'Chat with Ja'}
            description={
              activeSessionState?.recommendation.reason ||
              'Start a recommended focus area and Ja will guide you with a simple explanation, follow-up help, and a short practice round.'
            }
            action={
              activeSessionState?.completed ? (
                <StudentStatusChip tone="success">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Completed
                </StudentStatusChip>
              ) : activeSessionId ? (
                <StudentStatusChip tone="warning">In Progress</StudentStatusChip>
              ) : (
                <StudentStatusChip tone="info">Ready to start</StudentStatusChip>
              )
            }
          >
            <div className="space-y-5">
              {activeClass ? (
                <div className="rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--student-text-strong)]">
                      {classLabel(activeClass)}
                    </p>
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
              ) : null}

              <div className="student-panel rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] p-4">
                <div className="flex min-h-[360px] flex-col gap-4">
                  <div className="max-h-[420px] flex-1 space-y-4 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
                          <Bot className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-[var(--student-text-strong)]">
                            Ja is ready to help
                          </h3>
                          <p className="mt-2 max-w-xl text-sm text-[var(--student-text-muted)]">
                            Choose one recommended focus area on the right and Ja will turn it into a guided lesson and practice session.
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
                              'max-w-[80%] rounded-[1.5rem] px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-sm',
                              msg.role === 'user'
                                ? 'bg-[var(--student-text-strong)] text-[var(--student-accent-contrast)]'
                                : 'border border-[var(--student-outline)] bg-white text-[var(--student-text-strong)]',
                            )}
                          >
                            {msg.content}
                            {msg.createdAt && (
                              <div className={cn('mt-2 text-[10px]', msg.role === 'user' ? 'text-white/65' : 'text-[var(--student-text-muted)]')}>
                                {bubbleTime(msg.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {activeSessionId ? (
                    <div className="border-t border-[var(--student-outline)] pt-4">
                      <div className="flex items-end gap-3">
                        <textarea
                          value={messageInput}
                          onChange={(event) => setMessageInput(event.target.value)}
                          rows={2}
                          className="student-input min-h-[56px] flex-1 rounded-2xl border px-4 py-3 text-sm"
                          placeholder="Ask Ja to explain it in another way..."
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
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </StudentSectionCard>

          {activeSessionId && currentQuestions.length > 0 ? (
            <StudentSectionCard
              title="Practice Round"
              description="Answer these one at a time and let Ja check what you already understand."
              action={<StudentStatusChip tone="info">Round {activeSessionState?.round ?? 1}</StudentStatusChip>}
            >
              <div className="space-y-4">
                {currentQuestions.map((question: StudentTutorQuestion, index) => (
                  <div key={question.id} className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-4">
                    <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                      {index + 1}. {question.question}
                    </p>
                    {question.hint ? (
                      <p className="mt-2 text-xs text-[var(--student-text-muted)]">Hint: {question.hint}</p>
                    ) : null}
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
                <div className="flex justify-end">
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
            </StudentSectionCard>
          ) : null}
        </div>

        <div className="space-y-6">
          {!activeSessionId ? (
            <StudentSectionCard
              title="Suggested Focus Areas"
              description="These are the best starting points based on your recent work in the selected class."
            >
              <div className="space-y-3">
                {(bootstrap?.recommendations ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => startRecommendation(item)}
                    className="student-panel student-panel-hover w-full rounded-[1.5rem] p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-[var(--student-text-strong)]">{item.title}</p>
                        <p className="mt-2 text-sm text-[var(--student-text-muted)]">{item.reason}</p>
                      </div>
                      {startingRecommendationId === item.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--student-accent)]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[var(--student-accent)]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </StudentSectionCard>
          ) : (
            <StudentSectionCard
              title="Current Study Guide"
              description="Keep these lesson points beside you while chatting with Ja."
            >
              <div className="space-y-4">
                {activeSessionState?.lessonPlan?.length ? (
                  <div className="space-y-2">
                    {activeSessionState.lessonPlan.map((step, index) => (
                      <div key={`${step}-${index}`} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-3 text-sm text-[var(--student-text-strong)]">
                        {index + 1}. {step}
                      </div>
                    ))}
                  </div>
                ) : null}
                {activeSessionState?.lessonBody ? (
                  <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-4 text-sm leading-6 text-[var(--student-text-muted)]">
                    {activeSessionState.lessonBody}
                  </div>
                ) : null}
                {(activeSessionState?.citations ?? []).length ? (
                  <div className="space-y-2">
                    <StudentSectionHeader
                      title="Helpful Sources"
                      subtitle="The class materials Ja is using for this explanation."
                    />
                    {(activeSessionState?.citations ?? []).map((citation) => (
                      <div key={citation.chunkId} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-3">
                        <p className="text-sm font-semibold text-[var(--student-text-strong)]">{citation.label}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {citation.lessonId ? (
                            <Link href={`/dashboard/student/lessons/${citation.lessonId}`}>
                              <Button variant="outline" size="sm" className="student-button-outline rounded-xl">
                                Open Lesson
                              </Button>
                            </Link>
                          ) : null}
                          {citation.assessmentId ? (
                            <Link href={`/dashboard/student/assessments/${citation.assessmentId}`}>
                              <Button variant="outline" size="sm" className="student-button-outline rounded-xl">
                                Open Assessment
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </StudentSectionCard>
          )}

          <StudentSectionCard
            title="Saved Sessions"
            description="Reopen a previous tutoring thread for this class whenever you want to continue."
          >
            <div className="space-y-3">
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
          </StudentSectionCard>

          <StudentSectionCard
            title="Recent Clues"
            description="Ja looks at your latest lessons and attempts to decide what to help with first."
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--student-accent)]">
                  <BookOpen className="h-3.5 w-3.5" />
                  Lessons
                </p>
                <div className="space-y-2">
                  {(bootstrap?.recentLessons ?? []).slice(0, 3).map((item) => (
                    <div key={item.lessonId} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-3">
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
                    <div key={item.attemptId} className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-3">
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
          </StudentSectionCard>
        </div>
      </div>
    </StudentPageShell>
  );
}
