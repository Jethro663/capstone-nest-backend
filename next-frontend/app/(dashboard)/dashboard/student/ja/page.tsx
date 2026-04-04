"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  CircleDot,
  Flame,
  Loader2,
  MessageCircleQuestion,
  Orbit,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { getMotionProps } from "@/components/student/student-motion";
import { StudentStatusChip } from "@/components/student/student-primitives";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { jaService } from "@/services/ja-service";
import type {
  JaAskMessage,
  JaHubResponse,
  JaMode,
  JaPracticeSessionItem,
  JaPracticeSessionResponse,
} from "@/types/ja";
import { cn } from "@/utils/cn";
import "./ja-hub.css";

type AnswerState = Record<string, string[]>;

const MODE_ORDER: JaMode[] = ["practice", "ask", "review"];

const MODE_META: Record<
  JaMode,
  {
    title: string;
    subtitle: string;
    icon: typeof Swords;
    kicker: string;
  }
> = {
  practice: {
    title: "Practice",
    subtitle: "Adaptive objective missions grounded to your class.",
    icon: Swords,
    kicker: "Mission",
  },
  ask: {
    title: "Ask",
    subtitle: "Class-safe mentor chat for concept clarity.",
    icon: MessageCircleQuestion,
    kicker: "Coach",
  },
  review: {
    title: "Review",
    subtitle: "Replay weak spots from submitted assessments.",
    icon: CircleDot,
    kicker: "Replay",
  },
};

function itemReady(item: JaPracticeSessionItem, selected: string[] | undefined) {
  if (!selected || selected.length === 0) return false;
  return item.itemType === "multiple_select" ? selected.length > 0 : Boolean(selected[0]);
}

function classLabel(item: { subjectName: string; subjectCode: string }) {
  return `${item.subjectName} (${item.subjectCode})`;
}

function getSessionSubtitle(session: {
  status: string;
  currentIndex: number;
  questionCount: number;
}) {
  const answered = Math.min(session.currentIndex, session.questionCount);
  return `${session.status.toUpperCase()} · ${answered}/${session.questionCount}`;
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function StudentJaPage() {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const motionProps = useMemo(
    () => getMotionProps(reduceMotion),
    [reduceMotion],
  );

  const [hub, setHub] = useState<JaHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<JaMode>("practice");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [practiceSession, setPracticeSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [busy, setBusy] = useState(false);

  const [askThreadId, setAskThreadId] = useState<string>("");
  const [askMessages, setAskMessages] = useState<JaAskMessage[]>([]);
  const [askInput, setAskInput] = useState("");
  const [showGuardrailModal, setShowGuardrailModal] = useState(false);
  const [xpPulse, setXpPulse] = useState(false);

  const askTailRef = useRef<HTMLDivElement | null>(null);
  const xpRef = useRef(0);

  const refreshHub = useCallback(
    async (classId?: string) => {
      setLoading(true);
      try {
        const res = await jaService.getHub(classId);
        setHub(res.data);
        const nextClassId =
          res.data.selectedClassId ?? classId ?? res.data.classes[0]?.id ?? "";
        setSelectedClassId(nextClassId);
        if (!askThreadId && res.data.ask.threads[0]?.id) {
          setAskThreadId(res.data.ask.threads[0].id);
        }
      } catch {
        toast.error("Failed to load JA hub.");
        setHub(null);
      } finally {
        setLoading(false);
      }
    },
    [askThreadId],
  );

  useEffect(() => {
    void refreshHub();
  }, [refreshHub]);

  useEffect(() => {
    const currentXp = hub?.progress?.xpTotal ?? 0;
    if (currentXp > xpRef.current) {
      setXpPulse(true);
      const timeout = setTimeout(() => setXpPulse(false), 1200);
      xpRef.current = currentXp;
      return () => clearTimeout(timeout);
    }
    xpRef.current = currentXp;
    return undefined;
  }, [hub?.progress?.xpTotal]);

  useEffect(() => {
    if (mode !== "ask") return;
    askTailRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [askMessages, busy, mode, reduceMotion]);

  useEffect(() => {
    if (!askThreadId || mode !== "ask") return;
    void (async () => {
      try {
        const res = await jaService.getAskThread(askThreadId);
        setAskMessages(res.data.messages);
      } catch {
        toast.error("Failed to load JA Ask thread.");
      }
    })();
  }, [askThreadId, mode]);

  useEffect(() => {
    const activeSession = mode === "practice" ? practiceSession : reviewSession;
    if (!activeSession || activeSession.session.status !== "active") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const fn =
        mode === "practice" ? jaService.logEvent : jaService.logReviewEvent;
      void fn(activeSession.session.id, "focus_strike", {
        reason: "visibility_hidden",
        at: new Date().toISOString(),
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [mode, practiceSession, reviewSession]);

  const currentSession = mode === "practice" ? practiceSession : reviewSession;
  const activeItem = useMemo(() => {
    if (!currentSession) return null;
    return (
      currentSession.items.find((item) => !item.response) ??
      currentSession.items[currentSession.items.length - 1] ??
      null
    );
  }, [currentSession]);

  const answeredCount = useMemo(
    () => currentSession?.items.filter((item) => Boolean(item.response)).length ?? 0,
    [currentSession],
  );
  const canComplete = Boolean(
    currentSession &&
      currentSession.session.status === "active" &&
      answeredCount === currentSession.session.questionCount,
  );

  const masteryPercent = clampProgress(hub?.mastery?.percent ?? 0);
  const sessionProgressPercent = currentSession
    ? clampProgress(
        (answeredCount / Math.max(currentSession.session.questionCount, 1)) * 100,
      )
    : 0;

  const modeCount = useMemo(() => {
    if (!hub) return { practice: 0, ask: 0, review: 0 };
    return {
      practice: hub.practice.sessions.length,
      ask: hub.ask.threads.length,
      review: hub.review.sessions?.length ?? 0,
    };
  }, [hub]);

  const loadSession = async (sessionId: string, targetMode: JaMode) => {
    try {
      const res =
        targetMode === "practice"
          ? await jaService.getSession(sessionId)
          : await jaService.getReviewSession(sessionId);
      if (targetMode === "practice") setPracticeSession(res.data);
      if (targetMode === "review") setReviewSession(res.data);

      const draft: AnswerState = {};
      res.data.items.forEach((item) => {
        const answer = item.response?.studentAnswer;
        if (!answer || typeof answer !== "object") return;
        if (Array.isArray((answer as { selectedOptionIds?: unknown }).selectedOptionIds)) {
          draft[item.id] = (answer as { selectedOptionIds: string[] }).selectedOptionIds;
          return;
        }
        if (typeof (answer as { selectedOptionId?: unknown }).selectedOptionId === "string") {
          draft[item.id] = [(answer as { selectedOptionId: string }).selectedOptionId];
        }
      });
      setAnswers(draft);
    } catch {
      toast.error("Failed to load JA session.");
    }
  };

  const startPractice = async () => {
    if (!hub || !selectedClassId) return;
    setBusy(true);
    try {
      const recommendation = hub.practice.recommendations[0];
      const res = await jaService.createSession({ classId: selectedClassId, recommendation });
      setPracticeSession(res.data);
      setMode("practice");
      toast.success("Practice mission generated.");
      await refreshHub(selectedClassId);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "JA could not generate practice yet.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const startReview = async (attemptId: string) => {
    if (!selectedClassId) return;
    setBusy(true);
    try {
      const res = await jaService.createReviewSession({
        classId: selectedClassId,
        attemptId,
        questionCount: 10,
      });
      setReviewSession(res.data);
      setMode("review");
      await refreshHub(selectedClassId);
      toast.success("Review session started.");
    } catch {
      toast.error("Unable to generate review session.");
    } finally {
      setBusy(false);
    }
  };

  const submitCurrentAnswer = async () => {
    if (!currentSession || !activeItem) return;
    const selected = answers[activeItem.id];
    if (!itemReady(activeItem, selected)) {
      toast.error("Select an answer first.");
      return;
    }
    setBusy(true);
    try {
      const payload =
        activeItem.itemType === "multiple_select"
          ? { selectedOptionIds: selected }
          : { selectedOptionId: selected?.[0] };
      if (mode === "practice") {
        await jaService.submitResponse(currentSession.session.id, {
          itemId: activeItem.id,
          answer: payload,
        });
        await loadSession(currentSession.session.id, "practice");
      } else {
        await jaService.submitReviewResponse(currentSession.session.id, {
          itemId: activeItem.id,
          answer: payload,
        });
        await loadSession(currentSession.session.id, "review");
      }
    } catch {
      toast.error("Failed to save answer.");
    } finally {
      setBusy(false);
    }
  };

  const sendAsk = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClassId) return;
    const content = askInput.trim();
    if (!content) return;
    setBusy(true);
    try {
      let threadId = askThreadId;
      if (!threadId) {
        const created = await jaService.createAskThread({ classId: selectedClassId });
        threadId = created.data.thread.id;
        setAskThreadId(threadId);
      }
      const response = await jaService.sendAskMessage(threadId, { message: content });
      setAskMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, role: "student", content, blocked: false },
        response.data.message,
      ]);
      setAskInput("");
      if (response.data.blocked) setShowGuardrailModal(true);
      await refreshHub(selectedClassId);
    } catch {
      toast.error("JA Ask failed to respond.");
    } finally {
      setBusy(false);
    }
  };

  const completeCurrentSession = async () => {
    if (!currentSession) return;
    setBusy(true);
    try {
      if (mode === "practice") {
        await jaService.completeSession(currentSession.session.id);
        await loadSession(currentSession.session.id, "practice");
      } else {
        await jaService.completeReviewSession(currentSession.session.id);
        await loadSession(currentSession.session.id, "review");
      }
      await refreshHub(selectedClassId);
      toast.success("Session completed.");
    } catch {
      toast.error("Unable to complete session.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ja-hub-loading">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Warming up Ja...</p>
      </div>
    );
  }

  if (!hub || hub.classes.length === 0) {
    return <div className="ja-hub-empty">No eligible classes yet for JA.</div>;
  }

  const currentModeMeta = MODE_META[mode];

  return (
    <motion.div className="ja-hub-layout" {...motionProps.container}>
      <motion.aside className="ja-mode-panel student-panel" {...motionProps.item}>
        <div className="ja-mode-panel__head">
          <p className="ja-eyebrow">Ja Mission Control</p>
          <h2>Study Modes</h2>
        </div>

        <div className="ja-mode-grid" role="tablist" aria-label="JA study modes">
          {MODE_ORDER.map((modeKey) => {
            const details = MODE_META[modeKey];
            const Icon = details.icon;
            const isActive = mode === modeKey;
            return (
              <button
                key={modeKey}
                role="tab"
                aria-selected={isActive}
                className={cn("ja-mode-card", `mode-${modeKey}`, isActive && "active")}
                onClick={() => setMode(modeKey)}
              >
                <span className="ja-mode-card__icon">
                  <Icon />
                </span>
                <span className="ja-mode-card__copy">
                  <strong>{details.title}</strong>
                  <span>{details.subtitle}</span>
                </span>
                <span className="ja-mode-card__metric">
                  {modeCount[modeKey]} {details.kicker}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ja-saved-list" aria-live="polite">
          {mode === "practice" ? (
            <>
              <p>Saved Practice Sessions</p>
              {hub.practice.sessions.length === 0 ? (
                <span className="ja-inline-empty">No saved practice sessions yet.</span>
              ) : (
                hub.practice.sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => void loadSession(session.id, "practice")}
                    className="ja-session-chip"
                  >
                    <strong>Practice Mission</strong>
                    <span>{getSessionSubtitle(session)}</span>
                  </button>
                ))
              )}
            </>
          ) : null}

          {mode === "review" ? (
            <>
              <p>Saved Review Sessions</p>
              {(hub.review.sessions?.length ?? 0) === 0 ? (
                <span className="ja-inline-empty">No saved review sessions yet.</span>
              ) : (
                hub.review.sessions?.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => void loadSession(session.id, "review")}
                    className="ja-session-chip"
                  >
                    <strong>Assessment Replay</strong>
                    <span>{getSessionSubtitle(session)}</span>
                  </button>
                ))
              )}
            </>
          ) : null}

          {mode === "ask" ? (
            <>
              <p>Recent Ask Threads</p>
              {hub.ask.threads.length === 0 ? (
                <span className="ja-inline-empty">No thread yet. Start a guided question.</span>
              ) : (
                hub.ask.threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setAskThreadId(thread.id)}
                    className={cn(
                      "ja-session-chip",
                      askThreadId === thread.id && "is-selected",
                    )}
                  >
                    <strong>{thread.title || "Ask thread"}</strong>
                    <span>
                      {thread.status.toUpperCase()} · Updated{" "}
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </>
          ) : null}
        </div>
      </motion.aside>

      <motion.section className="ja-center-panel" {...motionProps.item}>
        <header className="ja-center-head student-panel">
          <div className="ja-head-title">
            <span className="ja-head-bot" aria-hidden="true">
              <Bot />
            </span>
            <div>
              <p className="ja-eyebrow">{currentModeMeta.kicker}</p>
              <strong>{currentModeMeta.title} with Ja</strong>
              <span>{currentModeMeta.subtitle}</span>
            </div>
          </div>
          <label className="ja-class-picker" aria-label="Class selector">
            <span>Class</span>
            <select
              value={selectedClassId}
              onChange={(event) => void refreshHub(event.target.value)}
            >
              {hub.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {mode === "ask" ? (
            <motion.div
              key="ask-stage"
              className="ja-thread-shell student-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="ja-thread-messages" aria-live="polite">
                {askMessages.length === 0 ? (
                  <div className="ja-thread-empty">
                    <h3>Ask anything class-grounded</h3>
                    <p>
                      Try: summarize this lesson, explain a concept in simpler words,
                      or give me three practice checks.
                    </p>
                  </div>
                ) : (
                  askMessages.map((msg) => (
                    <article
                      key={msg.id}
                      className={cn(
                        "ja-msg",
                        msg.role === "student" ? "student" : "ja",
                      )}
                    >
                      <header>
                        <strong>{msg.role === "student" ? "You" : "Ja"}</strong>
                        {msg.blocked ? (
                          <StudentStatusChip tone="warning">Guarded</StudentStatusChip>
                        ) : null}
                      </header>
                      <p>{msg.content}</p>
                    </article>
                  ))
                )}

                {busy ? (
                  <article className="ja-msg ja is-pending">
                    <header>
                      <strong>Ja</strong>
                    </header>
                    <p>
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking through your
                      question...
                    </p>
                  </article>
                ) : null}
                <div ref={askTailRef} />
              </div>

              <form onSubmit={sendAsk} className="ja-composer">
                <input
                  className="student-input"
                  value={askInput}
                  onChange={(event) => setAskInput(event.target.value)}
                  placeholder="Ask Ja anything about your class context..."
                />
                <Button
                  type="submit"
                  disabled={busy || !askInput.trim()}
                  className="student-button-solid"
                >
                  <Sparkles className="h-4 w-4" />
                  Send
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="session-stage"
              className="ja-session-shell"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {!currentSession ? (
                <div className="ja-session-empty student-panel">
                  {mode === "practice" ? (
                    <>
                      <div className="ja-empty-copy">
                        <h3>Start your next mission</h3>
                        <p>
                          Ja will generate 10 objective checks tuned to your current
                          learning focus.
                        </p>
                      </div>
                      <Button
                        onClick={() => void startPractice()}
                        disabled={busy}
                        className="student-button-solid"
                      >
                        <Swords className="h-4 w-4" />
                        Generate Practice
                      </Button>

                      <div className="ja-recommendation-list">
                        {hub.practice.recommendations.slice(0, 3).map((recommendation) => (
                          <article key={recommendation.id} className="ja-recommendation-item">
                            <header>
                              <h4>{recommendation.title}</h4>
                              <StudentStatusChip tone="info">Focus</StudentStatusChip>
                            </header>
                            <p>{recommendation.reason}</p>
                            <span>{recommendation.focusText}</span>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ja-empty-copy">
                        <h3>Pick an assessment to replay</h3>
                        <p>
                          Review mode generates a focused replay session from a submitted
                          assessment attempt.
                        </p>
                      </div>

                      <div className="ja-review-attempts">
                        {hub.review.eligibleAttempts.length === 0 ? (
                          <p className="ja-inline-empty">
                            No eligible attempts yet. Complete an assessment and return to
                            replay weak areas.
                          </p>
                        ) : (
                          hub.review.eligibleAttempts.map((attempt) => (
                            <button
                              key={attempt.attemptId}
                              onClick={() => void startReview(attempt.attemptId)}
                            >
                              <strong>{attempt.assessmentTitle}</strong>
                              <span>
                                Submitted {new Date(attempt.submittedAt).toLocaleDateString()} ·{" "}
                                {attempt.score !== null ? `${attempt.score}%` : "Ungraded"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="ja-session-active student-panel">
                  <div className="ja-session-head">
                    <div>
                      <p className="ja-eyebrow">{mode === "practice" ? "Practice" : "Review"}</p>
                      <h3>
                        {answeredCount}/{currentSession.session.questionCount} completed
                      </h3>
                    </div>
                    <StudentStatusChip
                      tone={canComplete ? "success" : "info"}
                      className="ja-status-chip"
                    >
                      {canComplete ? "Ready to Complete" : "In Progress"}
                    </StudentStatusChip>
                  </div>

                  <Progress value={sessionProgressPercent} />

                  {activeItem ? (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.article
                        key={activeItem.id}
                        className="ja-question"
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                        exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <header>
                          <p className="ja-question-index">
                            Item {answeredCount + (activeItem.response ? 0 : 1)} ·{" "}
                            {activeItem.itemType === "multiple_select"
                              ? "Multiple Select"
                              : "Single Select"}
                          </p>
                          <h4>{activeItem.prompt}</h4>
                          {activeItem.hint ? <p>{activeItem.hint}</p> : null}
                        </header>

                        <div
                          className="ja-option-grid"
                          role={
                            activeItem.itemType === "multiple_select"
                              ? "group"
                              : "radiogroup"
                          }
                          aria-label="Question options"
                        >
                          {(activeItem.options ?? []).map((option) => {
                            const selected = (answers[activeItem.id] ?? []).includes(option.id);
                            return (
                              <button
                                key={option.id}
                                className={cn(selected && "selected")}
                                onClick={() => {
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [activeItem.id]:
                                      activeItem.itemType === "multiple_select"
                                        ? (prev[activeItem.id] ?? []).includes(option.id)
                                          ? (prev[activeItem.id] ?? []).filter(
                                              (value) => value !== option.id,
                                            )
                                          : [...(prev[activeItem.id] ?? []), option.id]
                                        : [option.id],
                                  }));
                                }}
                                aria-pressed={selected}
                                disabled={Boolean(activeItem.response)}
                              >
                                <span className="ja-option-mark" aria-hidden="true">
                                  {selected ? "●" : "○"}
                                </span>
                                <span>{option.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {activeItem.response ? (
                          <div
                            className={cn(
                              "ja-feedback",
                              activeItem.response.isCorrect ? "is-correct" : "is-incorrect",
                            )}
                          >
                            {activeItem.response.feedback}
                          </div>
                        ) : null}

                        <div className="ja-question-actions">
                          <Button
                            onClick={() => void submitCurrentAnswer()}
                            disabled={
                              busy ||
                              Boolean(activeItem.response) ||
                              !itemReady(activeItem, answers[activeItem.id])
                            }
                            className="student-button-solid"
                          >
                            Submit Answer
                          </Button>

                          {canComplete ? (
                            <Button
                              variant="outline"
                              onClick={() => void completeCurrentSession()}
                              disabled={busy}
                              className="student-button-outline"
                            >
                              Complete Session
                            </Button>
                          ) : null}
                        </div>
                      </motion.article>
                    </AnimatePresence>
                  ) : null}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.aside className="ja-progress-panel student-panel" {...motionProps.item}>
        <div className="ja-progress-head">
          <p className="ja-eyebrow">Learning Progress</p>
          <h2>Growth Snapshot</h2>
        </div>

        <div className={cn("ja-mastery-ring", xpPulse && "is-pulsing")}>
          <div style={{ ["--ja-progress" as string]: `${masteryPercent}` }} />
          <strong>{masteryPercent}%</strong>
          <span>{hub.mastery?.label ?? "Mastery"}</span>
        </div>

        <div className="ja-stats" aria-live="polite">
          <article>
            <Target className="h-4 w-4" />
            <div>
              <strong>{hub.progress?.xpTotal ?? 0}</strong>
              <span>Total XP</span>
            </div>
          </article>
          <article>
            <Flame className="h-4 w-4" />
            <div>
              <strong>{hub.progress?.streakDays ?? 0}</strong>
              <span>Day Streak</span>
            </div>
          </article>
          <article>
            <Orbit className="h-4 w-4" />
            <div>
              <strong>{hub.progress?.sessionsCompleted ?? 0}</strong>
              <span>Sessions Done</span>
            </div>
          </article>
          <article>
            <Trophy className="h-4 w-4" />
            <div>
              <strong>{hub.badges.filter((badge) => badge.unlocked).length}</strong>
              <span>Badges Unlocked</span>
            </div>
          </article>
        </div>

        <div className="ja-badges">
          {hub.badges.length === 0 ? (
            <span className="ja-inline-empty">No badges yet. Keep practicing.</span>
          ) : (
            hub.badges.map((badge) => (
              <div key={badge.id} className={badge.unlocked ? "badge unlocked" : "badge locked"}>
                <strong>{badge.label}</strong>
                <span>Level {badge.level}</span>
              </div>
            ))
          )}
        </div>
      </motion.aside>

      {showGuardrailModal ? (
        <div className="ja-guardrail-modal">
          <div>
            <ShieldAlert />
            <h3>JA blocked that request</h3>
            <p>This attempt was logged for safety review. Ask a class-grounded study question instead.</p>
            <Button onClick={() => setShowGuardrailModal(false)} className="student-button-solid">
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
