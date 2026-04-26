"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDot,
  LockKeyhole,
  Loader2,
  Menu,
  MessageCircleQuestion,
  ShieldAlert,
  Sparkles,
  Swords,
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

type AnswerState = Record<string, string[]>;
type JaEntry = "sidebar" | "class" | "lxp" | "lesson" | "assessment";
type JaActivityFilter = "all" | JaMode;

interface JaActivityItem {
  id: string;
  mode: JaMode;
  title: string;
  subtitle: string;
  classLabel: string;
  status: string;
  updatedAt: string;
}

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
    subtitle: "Fresh objective checks grounded to your class lessons.",
    icon: Swords,
    kicker: "Drill",
  },
  ask: {
    title: "Ask",
    subtitle: "Class-grounded mentor chat for concept clarity.",
    icon: MessageCircleQuestion,
    kicker: "Coach",
  },
  review: {
    title: "Replay",
    subtitle: "Revisit weak spots from submitted assessments.",
    icon: CircleDot,
    kicker: "Replay",
  },
};

const ASK_QUICK_PROMPTS = [
  "Explain this topic in simpler words.",
  "Give me 3 quick practice checks.",
  "Make a 5-minute study plan for tonight.",
];

function isJaMode(value: string | null | undefined): value is JaMode {
  return value === "practice" || value === "ask" || value === "review";
}

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
  return `${session.status.toUpperCase()} - ${answered}/${session.questionCount}`;
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getBackLabel(entry?: JaEntry) {
  if (entry === "class") return "Back to class";
  if (entry === "lxp") return "Back to Learners Path";
  if (entry === "lesson") return "Back to lesson";
  if (entry === "assessment") return "Back to assessment";
  return "Back";
}

function getActivityTimestamp(value?: string | null) {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

interface StudentJaWorkspaceProps {
  className?: string;
  initialClassId?: string;
  initialEntry?: JaEntry;
  initialMode?: JaMode;
  returnTo?: string;
}

export default function StudentJaWorkspace({
  className,
  initialClassId,
  initialEntry,
  initialMode,
  returnTo,
}: StudentJaWorkspaceProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const motionProps = useMemo(
    () => getMotionProps(reduceMotion),
    [reduceMotion],
  );
  const conditionalSurfaceMotionProps = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const [hub, setHub] = useState<JaHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<JaMode>(
    isJaMode(initialMode) ? initialMode : "ask",
  );
  const [showHome, setShowHome] = useState(
    !isJaMode(initialMode) && (!initialClassId || initialEntry === "sidebar"),
  );
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classSelectorOpen, setClassSelectorOpen] = useState(
    !(initialClassId && initialEntry && initialEntry !== "sidebar"),
  );
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [activityFilter, setActivityFilter] = useState<JaActivityFilter>("all");

  const [practiceSession, setPracticeSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [busy, setBusy] = useState(false);

  const [askThreadId, setAskThreadId] = useState<string>("");
  const [askMessages, setAskMessages] = useState<JaAskMessage[]>([]);
  const [askInput, setAskInput] = useState("");
  const [showGuardrailModal, setShowGuardrailModal] = useState(false);
  const askTailRef = useRef<HTMLDivElement | null>(null);
  const classMenuRef = useRef<HTMLDivElement | null>(null);

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
    void refreshHub(initialClassId);
  }, [initialClassId, refreshHub]);

  useEffect(() => {
    if (isJaMode(initialMode)) {
      setMode(initialMode);
      setShowHome(false);
    }
  }, [initialMode]);

  useEffect(() => {
    if (mode !== "ask" || !askTailRef.current?.scrollIntoView) return;
    askTailRef.current.scrollIntoView({
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
    if (!classMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!classMenuRef.current?.contains(event.target as Node)) {
        setClassMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [classMenuOpen]);

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

  const selectedClass = useMemo(
    () => hub?.classes.find((item) => item.id === selectedClassId) ?? null,
    [hub?.classes, selectedClassId],
  );
  const selectedClassLabel = selectedClass ? classLabel(selectedClass) : "Selected class";

  const activityItems = useMemo<JaActivityItem[]>(() => {
    if (!hub) return [];
    const className = selectedClassLabel;
    const askItems = hub.ask.threads.map((thread) => ({
      id: thread.id,
      mode: "ask" as const,
      title: thread.title || "Ask thread",
      subtitle: "Ask thread",
      classLabel: className,
      status: thread.status.toUpperCase(),
      updatedAt: thread.lastMessageAt || thread.updatedAt,
    }));
    const practiceItems = hub.practice.sessions.map((session) => ({
      id: session.id,
      mode: "practice" as const,
      title: "Practice Mission",
      subtitle: getSessionSubtitle(session),
      classLabel: className,
      status: session.status.toUpperCase(),
      updatedAt: session.completedAt || session.startedAt,
    }));
    const reviewItems = (hub.review.sessions ?? []).map((session) => ({
      id: session.id,
      mode: "review" as const,
      title: "Assessment Replay",
      subtitle: getSessionSubtitle(session),
      classLabel: className,
      status: session.status.toUpperCase(),
      updatedAt: session.completedAt || session.startedAt,
    }));
    return [...askItems, ...practiceItems, ...reviewItems].sort(
      (left, right) => getActivityTimestamp(right.updatedAt) - getActivityTimestamp(left.updatedAt),
    );
  }, [hub, selectedClassLabel]);

  const filteredActivityItems = useMemo(
    () =>
      activityFilter === "all"
        ? activityItems
        : activityItems.filter((item) => item.mode === activityFilter),
    [activityFilter, activityItems],
  );

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

  const selectMode = (nextMode: JaMode) => {
    setMode(nextMode);
    setShowHome(false);
    setActivityFilter(nextMode);
  };

  const selectActivity = (item: JaActivityItem) => {
    setShowHome(false);
    setMode(item.mode);
    if (item.mode === "ask") {
      setAskThreadId(item.id);
      return;
    }
    void loadSession(item.id, item.mode);
  };

  const startPractice = async () => {
    if (!hub || !selectedClassId) return;
    setBusy(true);
    try {
      const recommendation = hub.practice.recommendations[0];
      const res = await jaService.createSession({ classId: selectedClassId, recommendation });
      setPracticeSession(res.data);
      setMode("practice");
      setShowHome(false);
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
      setShowHome(false);
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
        <p>Preparing JA Hub...</p>
      </div>
    );
  }

  if (!hub || hub.classes.length === 0) {
    return (
      <div className="ja-hub-empty">
        No Learners Path classes are ready for JA Hub yet.
      </div>
    );
  }

  const isContextualEntry = Boolean(initialClassId && initialEntry && initialEntry !== "sidebar");

  return (
    <motion.div
      className={cn(
        "ja-hub-layout",
        mode === "ask" && "ask-mode",
        !historyOpen && "history-hidden",
        className,
      )}
      {...motionProps.container}
    >
      {historyOpen ? (
        <motion.aside
          className="ja-mode-panel student-panel"
          {...conditionalSurfaceMotionProps}
        >
          <div className="ja-mode-panel__head">
            <button
              type="button"
              className="ja-history-toggle"
              aria-label="Hide activity history"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen(false)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="ja-eyebrow">JA Hub</p>
              <h2>Activity history</h2>
            </div>
          </div>
          <button
            type="button"
            className="ja-change-mode"
            onClick={() => setShowHome(true)}
          >
            Change mode
          </button>

          <div className="ja-mode-grid" role="tablist" aria-label="JA study modes">
            {MODE_ORDER.map((modeKey) => {
              const details = MODE_META[modeKey];
              const Icon = details.icon;
              const isActive = mode === modeKey;
              return (
                <button
                  key={modeKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn("ja-mode-card", `mode-${modeKey}`, isActive && "active")}
                  onClick={() => selectMode(modeKey)}
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

          <div className="ja-activity-filters" aria-label="Activity filters">
            {(["all", ...MODE_ORDER] as JaActivityFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                data-active={activityFilter === filter}
                onClick={() => setActivityFilter(filter)}
              >
                {filter === "all" ? "All" : MODE_META[filter].title}
              </button>
            ))}
          </div>

          <div className="ja-saved-list ja-activity-list" aria-live="polite">
            {filteredActivityItems.length === 0 ? (
              <span className="ja-inline-empty">No saved JA activity for this filter yet.</span>
            ) : (
              filteredActivityItems.map((item) => (
                <button
                  key={`${item.mode}-${item.id}`}
                  type="button"
                  onClick={() => selectActivity(item)}
                  className={cn(
                    "ja-session-chip",
                    item.mode === mode && !showHome && "is-selected",
                  )}
                >
                  <span className={cn("ja-activity-tag", `mode-${item.mode}`)}>
                    {MODE_META[item.mode].title}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.classLabel}</span>
                  <span>
                    {item.status} - {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>

        </motion.aside>
      ) : null}

      <motion.section className="ja-center-panel" {...motionProps.item}>
        {!historyOpen ? (
          <button
            type="button"
            className="ja-history-reopen"
            aria-label="Show activity history"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}
        <div className="ja-topbar">
          <div className="ja-topbar__leading">
            {classSelectorOpen ? (
              <div className="ja-class-menu" ref={classMenuRef}>
                <button
                  type="button"
                  className="ja-class-menu__trigger"
                  aria-label="Class selector"
                  aria-haspopup="listbox"
                  aria-expanded={classMenuOpen}
                  onClick={() => setClassMenuOpen((current) => !current)}
                >
                  <span>{selectedClassLabel}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {classMenuOpen ? (
                  <div className="ja-class-menu__popover" role="listbox" aria-label="Class options">
                    {hub.classes.map((item) => {
                      const isSelected = item.id === selectedClassId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className="ja-class-menu__option"
                          onClick={() => {
                            setClassMenuOpen(false);
                            void refreshHub(item.id);
                          }}
                        >
                          <span>{classLabel(item)}</span>
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <span className="ja-class-label-static">{selectedClassLabel}</span>
            )}
          </div>
          <div className="ja-topbar__actions">
            {returnTo ? (
              <Link href={returnTo} className="ja-head-link">
                <ArrowLeft className="h-4 w-4" />
                {getBackLabel(initialEntry)}
              </Link>
            ) : null}
            {!classSelectorOpen ? (
              <>
                <span className="ja-class-lock">
                  <LockKeyhole className="h-4 w-4" />
                  Class locked
                </span>
                {isContextualEntry ? (
                  <button
                    type="button"
                    className="ja-head-link"
                    onClick={() => setClassSelectorOpen(true)}
                  >
                    Change class
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {showHome ? (
            <motion.div
              key="home-stage"
              className="ja-home-shell student-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="ja-home-copy">
                <p className="ja-eyebrow">Start with a mode</p>
                <h2>How do you want JA to help?</h2>
                <p>
                  Choose the kind of support first. JA will keep the selected class context
                  and load the matching workspace.
                </p>
              </div>
              <div className="ja-home-modes">
                {MODE_ORDER.map((modeKey) => {
                  const details = MODE_META[modeKey];
                  const Icon = details.icon;
                  return (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => selectMode(modeKey)}
                      className={cn("ja-mode-card", `mode-${modeKey}`)}
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
            </motion.div>
          ) : mode === "ask" ? (
            <motion.div
              key="ask-stage"
              className="ja-thread-shell student-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="ja-quick-prompts">
                {ASK_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="ja-quick-prompt"
                    onClick={() => setAskInput(prompt)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="ja-thread-messages" aria-live="polite">
                {askMessages.length === 0 ? (
                  <div className="ja-thread-empty">
                    <h3>Ask a class-grounded question</h3>
                    <p>
                      Try: summarize the lesson, explain a concept in simpler words,
                      or build three quick checks before your next replay.
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
                        <strong>{msg.role === "student" ? "You" : "JA"}</strong>
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
                      <strong>JA</strong>
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
                  className="student-input ja-composer-input"
                  value={askInput}
                  onChange={(event) => setAskInput(event.target.value)}
                  placeholder="Ask JA anything about the selected class..."
                />
                <Button
                  type="submit"
                  disabled={busy || !askInput.trim()}
                  className="student-button-solid ja-send-button"
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
                        <h3>Start your next practice run</h3>
                        <p>
                          JA will generate 10 objective checks tuned to your current
                          learning focus in this class.
                        </p>
                      </div>
                      <Button
                        onClick={() => void startPractice()}
                        disabled={busy}
                        className="student-button-solid ja-primary-action"
                      >
                        <Swords className="h-4 w-4" />
                        Generate Practice Run
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
                          Replay mode builds a focused retry session from one submitted
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
                              type="button"
                              onClick={() => void startReview(attempt.attemptId)}
                            >
                              <strong>{attempt.assessmentTitle}</strong>
                              <span>
                                Submitted {new Date(attempt.submittedAt).toLocaleDateString()} |{" "}
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
                      <p className="ja-eyebrow">{mode === "practice" ? "Practice" : "Replay"}</p>
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
                            Item {answeredCount + (activeItem.response ? 0 : 1)} |{" "}
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
                                type="button"
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
                                  {selected ? "[x]" : "[ ]"}
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
                            className="student-button-solid ja-primary-action"
                          >
                            Submit Answer
                          </Button>

                          {canComplete ? (
                            <Button
                              variant="outline"
                              onClick={() => void completeCurrentSession()}
                              disabled={busy}
                              className="student-button-outline ja-secondary-action"
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

      {showGuardrailModal ? (
        <div className="ja-guardrail-modal">
          <div>
            <ShieldAlert />
            <h3>JA blocked that request</h3>
            <p>This attempt was logged for safety review. Ask a class-grounded study question instead.</p>
            <Button
              onClick={() => setShowGuardrailModal(false)}
              className="student-button-solid ja-primary-action"
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

