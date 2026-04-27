"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  LockKeyhole,
  Loader2,
  Menu,
  MessageCircleQuestion,
  ShieldAlert,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getMotionProps } from "@/components/student/student-motion";
import { StudentStatusChip } from "@/components/student/student-primitives";
import { RichTextRenderer } from "@/components/shared/rich-text/RichTextRenderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getApiErrorMessage } from "@/lib/api-error";
import { jaService } from "@/services/ja-service";
import type {
  JaAskMessage,
  JaAskLessonContextSummary,
  JaHubResponse,
  JaMode,
  JaPracticeSessionItem,
  JaPracticeSessionResponse,
  JaAskThreadSummary,
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

const JA_COACH_SPLIT_PATTERN = /\s*JA Coach:\s*/i;
const JA_AVATAR_IMAGES = {
  default: "/images/JA/ja_wave.png",
  guarded: "/images/JA/ja_sad.png",
  thinking: "/images/JA/ja_thinking.png",
} as const;
const DEFAULT_JA_ASK_GUIDELINES = [
  "Pick a visible lesson first when you want a summary, explanation, or study plan.",
  "Ask for concept help, quick reviews, what to study next, or a short lesson recap.",
  "JA blocks requests that jump to unrelated subjects or ask for direct answer keys.",
];

interface JaAskPresetAction {
  id: string;
  label: string;
}

const ASK_PRESET_GROUPS: Array<{
  id: string;
  label: string;
  items: JaAskPresetAction[];
}> = [
  {
    id: "ask",
    label: "Ask",
    items: [
      { id: "explain-lesson", label: "Explain the lesson" },
      { id: "summarize-main-idea", label: "Summarize main idea" },
      { id: "study-next", label: "What should I study next?" },
    ],
  },
  {
    id: "question",
    label: "Question",
    items: [
      { id: "give-question", label: "Give me a question" },
      { id: "quiz-me", label: "Quiz me on this lesson" },
      { id: "unclear-parts", label: "Unclear parts check" },
    ],
  },
  {
    id: "review",
    label: "Review",
    items: [
      { id: "key-concepts", label: "Key concepts review" },
      { id: "study-plan", label: "Make a study plan" },
      { id: "vocabulary-review", label: "Vocabulary review" },
    ],
  },
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

function splitCoachPrompt(prompt: string) {
  const parts = prompt.split(JA_COACH_SPLIT_PATTERN);
  if (parts.length < 2) {
    return { prompt: prompt.trim(), coach: "" };
  }
  return {
    prompt: parts[0].trim(),
    coach: parts.slice(1).join(" JA Coach: ").trim(),
  };
}

function JaAssistantAvatar({
  mood = "default",
}: {
  mood?: keyof typeof JA_AVATAR_IMAGES;
}) {
  return (
    <span className="ja-msg-avatar ja-av" aria-hidden="true">
      <Image
        src={JA_AVATAR_IMAGES[mood]}
        alt=""
        width={40}
        height={40}
        className="ja-msg-avatar__image"
      />
    </span>
  );
}

function buildLessonContextLabel(context: JaAskLessonContextSummary) {
  return [context.moduleTitle, context.sectionTitle].filter(Boolean).join(" / ");
}

function resolveThreadLessonContext(
  thread: {
    contextLessonId?: string | null;
    contextLessonTitle?: string | null;
    contextModuleTitle?: string | null;
    contextSectionTitle?: string | null;
  },
  fallback: JaAskLessonContextSummary | null = null,
) {
  return thread.contextLessonId && thread.contextLessonTitle
    ? {
        lessonId: thread.contextLessonId,
        title: thread.contextLessonTitle,
        moduleTitle: thread.contextModuleTitle ?? null,
        sectionTitle: thread.contextSectionTitle ?? null,
      }
    : fallback;
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
  const [showHome, setShowHome] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classSelectorOpen, setClassSelectorOpen] = useState(
    !(initialClassId && initialEntry && initialEntry !== "sidebar"),
  );
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [activityFilter, setActivityFilter] = useState<JaActivityFilter>("all");
  const [activeActivityKey, setActiveActivityKey] = useState("");

  const [practiceSession, setPracticeSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewCursor, setReviewCursor] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [busy, setBusy] = useState(false);

  const [askThreadId, setAskThreadId] = useState<string>("");
  const [askThreadClassId, setAskThreadClassId] = useState<string>("");
  const [askMessages, setAskMessages] = useState<JaAskMessage[]>([]);
  const [askError, setAskError] = useState("");
  const [selectedLessonContext, setSelectedLessonContext] =
    useState<JaAskLessonContextSummary | null>(null);
  const [askMenuOpen, setAskMenuOpen] = useState(false);
  const [showGuardrailModal, setShowGuardrailModal] = useState(false);
  const askTailRef = useRef<HTMLDivElement | null>(null);
  const classMenuRef = useRef<HTMLDivElement | null>(null);
  const askMenuRef = useRef<HTMLDivElement | null>(null);

  const clearAnswersForItems = useCallback((itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const itemIdSet = new Set(itemIds);
    setAnswers((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([itemId]) => !itemIdSet.has(itemId)),
      ),
    );
  }, []);

  const resetReviewStage = useCallback(() => {
    clearAnswersForItems(reviewSession?.items.map((item) => item.id) ?? []);
    setReviewSession(null);
    setReviewCursor(0);
    setActiveActivityKey("");
  }, [clearAnswersForItems, reviewSession]);

  const startNewAskChat = useCallback(() => {
    setAskThreadId("");
    setAskThreadClassId(selectedClassId);
    setAskMessages([]);
    setAskError("");
    setSelectedLessonContext(null);
    setAskMenuOpen(false);
    setShowGuardrailModal(false);
    setActiveActivityKey("");
    setMode("ask");
    setShowHome(false);
    setActivityFilter("ask");
  }, [selectedClassId]);

  const syncAskThreadSummary = useCallback(
    (
      thread: {
        id: string;
        title: string;
        classId: string;
        contextLessonId?: string | null;
        contextLessonTitle?: string | null;
        contextModuleTitle?: string | null;
        contextSectionTitle?: string | null;
      },
      timestamp: string,
    ) => {
      setHub((current) => {
        if (!current || current.selectedClassId !== thread.classId) return current;
        const nextSummary: JaAskThreadSummary = {
          id: thread.id,
          title: thread.title,
          status: "active",
          updatedAt: timestamp,
          lastMessageAt: timestamp,
          contextLessonId: thread.contextLessonId ?? null,
          contextLessonTitle: thread.contextLessonTitle ?? null,
          contextModuleTitle: thread.contextModuleTitle ?? null,
          contextSectionTitle: thread.contextSectionTitle ?? null,
        };
        return {
          ...current,
          ask: {
            ...current.ask,
            threads: [
              nextSummary,
              ...current.ask.threads.filter((entry) => entry.id !== thread.id),
            ].slice(0, 12),
          },
        };
      });
    },
    [],
  );

  const refreshHub = useCallback(
    async (classId?: string, options?: { resetContext?: boolean }) => {
      setLoading(true);
      try {
        const res = await jaService.getHub(classId);
        setHub(res.data);
        const nextClassId =
          res.data.selectedClassId ?? classId ?? res.data.classes[0]?.id ?? "";
        setSelectedClassId(nextClassId);
        setAskThreadId((current) => {
          if (options?.resetContext) {
            return res.data.ask.threads[0]?.id ?? "";
          }
          return current || res.data.ask.threads[0]?.id || "";
        });
        if (options?.resetContext) {
          setAskThreadClassId("");
          setAskMessages([]);
          setAskError("");
          setSelectedLessonContext(null);
          setAskMenuOpen(false);
          setPracticeSession(null);
          setReviewSession(null);
          setAnswers({});
          setReviewCursor(0);
          setActiveActivityKey("");
        }
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to load JA hub."));
        setHub(null);
      } finally {
        setLoading(false);
      }
    },
    [],
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
        if (selectedClassId && res.data.thread.classId !== selectedClassId) {
          setAskThreadId("");
          setAskThreadClassId("");
          setAskMessages([]);
          setAskError("");
          return;
        }
        setAskThreadClassId(res.data.thread.classId);
        setAskMessages(res.data.messages);
        setSelectedLessonContext(resolveThreadLessonContext(res.data.thread));
      } catch (error: unknown) {
        setAskThreadId("");
        setAskThreadClassId("");
        setAskMessages([]);
        setAskError(getApiErrorMessage(error, "Failed to load JA Ask thread."));
        toast.error(getApiErrorMessage(error, "Failed to load JA Ask thread."));
      }
    })();
  }, [askThreadId, mode, selectedClassId]);

  useEffect(() => {
    if (!selectedLessonContext || !hub) return;
    const stillVisible = hub.ask.lessonContexts.some(
      (entry) => entry.lessonId === selectedLessonContext.lessonId,
    );
    if (!stillVisible) {
      setSelectedLessonContext(null);
    }
  }, [hub, selectedLessonContext]);

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
    if (!askMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!askMenuRef.current?.contains(event.target as Node)) {
        setAskMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [askMenuOpen]);

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
  const activeItemIndex = useMemo(() => {
    if (!currentSession) return null;
    if (currentSession.items.length === 0) return -1;
    if (mode === "review") {
      return Math.min(Math.max(reviewCursor, 0), currentSession.items.length - 1);
    }
    const nextIndex = currentSession.items.findIndex((item) => !item.response);
    return nextIndex >= 0 ? nextIndex : currentSession.items.length - 1;
  }, [currentSession, mode, reviewCursor]);

  const activeItem =
    currentSession && activeItemIndex !== null && activeItemIndex >= 0
      ? currentSession.items[activeItemIndex] ?? null
      : null;

  const activeItemPrompt = useMemo(
    () => splitCoachPrompt(activeItem?.prompt ?? ""),
    [activeItem?.prompt],
  );
  const activeCoachText = activeItemPrompt.coach || activeItem?.hint || "";

  const answeredCount = useMemo(
    () => currentSession?.items.filter((item) => Boolean(item.response)).length ?? 0,
    [currentSession],
  );
  const allSessionItemsReady = useMemo(
    () =>
      currentSession?.items.every(
        (item) => Boolean(item.response) || itemReady(item, answers[item.id]),
      ) ?? false,
    [answers, currentSession],
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
      subtitle: thread.contextLessonTitle
        ? `Lesson: ${thread.contextLessonTitle}`
        : "Ask thread",
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
  const askLessonContexts = hub?.ask.lessonContexts ?? [];
  const askGuidelines = hub?.ask.guidelines?.length
    ? hub.ask.guidelines
    : DEFAULT_JA_ASK_GUIDELINES;

  const loadSession = async (sessionId: string, targetMode: JaMode) => {
    try {
      setActiveActivityKey(`${targetMode}:${sessionId}`);
      const res =
        targetMode === "practice"
          ? await jaService.getSession(sessionId)
          : await jaService.getReviewSession(sessionId);
      if (targetMode === "practice") setPracticeSession(res.data);
      if (targetMode === "review") {
        setReviewSession(res.data);
        setReviewCursor(0);
      }

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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load JA session."));
    }
  };

  const selectMode = (nextMode: JaMode) => {
    if (nextMode === "review") {
      resetReviewStage();
    } else {
      setActiveActivityKey("");
    }
    setAskMenuOpen(false);
    setMode(nextMode);
    setShowHome(false);
    setActivityFilter(nextMode);
  };

  const selectActivity = (item: JaActivityItem) => {
    setShowHome(false);
    setMode(item.mode);
    setActivityFilter(item.mode);
    setActiveActivityKey(`${item.mode}:${item.id}`);
    setAskMenuOpen(false);
    if (item.mode === "ask") {
      setAskThreadId(item.id);
      return;
    }
    void loadSession(item.id, item.mode);
  };

  const selectAskLessonContext = (context: JaAskLessonContextSummary) => {
    setSelectedLessonContext(context);
    setAskThreadId("");
    setAskThreadClassId(selectedClassId);
    setAskMessages([]);
    setAskError("");
    setAskMenuOpen(false);
    setShowGuardrailModal(false);
    setActiveActivityKey("");
    setMode("ask");
    setShowHome(false);
    setActivityFilter("ask");
  };

  const clearAskLessonContext = () => {
    setSelectedLessonContext(null);
    setAskThreadId("");
    setAskThreadClassId(selectedClassId);
    setAskMessages([]);
    setAskError("");
    setAskMenuOpen(false);
    setShowGuardrailModal(false);
    setActiveActivityKey("");
  };

  const startPractice = async () => {
    if (!hub || !selectedClassId) return;
    setBusy(true);
    try {
      const recommendation = hub.practice.recommendations[0];
      const res = await jaService.createSession({ classId: selectedClassId, recommendation });
      setPracticeSession(res.data);
      setActiveActivityKey(`practice:${res.data.session.id}`);
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
      setReviewCursor(0);
      setActiveActivityKey(`review:${res.data.session.id}`);
      setMode("review");
      setShowHome(false);
      await refreshHub(selectedClassId);
      toast.success("Review session started.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to generate review session."));
    } finally {
      setBusy(false);
    }
  };

  const submitCurrentAnswer = async () => {
    if (!currentSession || !activeItem) return;
    setBusy(true);
    try {
      if (mode === "practice") {
        const selected = answers[activeItem.id];
        if (!itemReady(activeItem, selected)) {
          toast.error("Select an answer first.");
          return;
        }
        const payload =
          activeItem.itemType === "multiple_select"
            ? { selectedOptionIds: selected }
            : { selectedOptionId: selected?.[0] };
        await jaService.submitResponse(currentSession.session.id, {
          itemId: activeItem.id,
          answer: payload,
        });
        await loadSession(currentSession.session.id, "practice");
      } else {
        const unansweredItems = currentSession.items.filter((item) => !item.response);
        const incompleteItem = unansweredItems.find(
          (item) => !itemReady(item, answers[item.id]),
        );
        if (incompleteItem) {
          toast.error("Answer every replay item before submitting.");
          return;
        }
        for (const item of unansweredItems) {
          const selected = answers[item.id];
          const payload =
            item.itemType === "multiple_select"
              ? { selectedOptionIds: selected }
              : { selectedOptionId: selected?.[0] };
          await jaService.submitReviewResponse(currentSession.session.id, {
            itemId: item.id,
            answer: payload,
          });
        }
        await loadSession(currentSession.session.id, "review");
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save answer."));
    } finally {
      setBusy(false);
    }
  };

  const sendAskPreset = async (preset: JaAskPresetAction) => {
    if (!selectedClassId || busy) return;
    setAskMenuOpen(false);

    const localMessageId = `local-${Date.now()}`;
    const studentMessage: JaAskMessage = {
      id: localMessageId,
      role: "student",
      content: preset.label,
      blocked: false,
      quickAction: preset.label,
    };

    if (!selectedLessonContext) {
      const warningMessageId = `warning-${Date.now()}-lesson-context`;
      setAskError("");
      setShowGuardrailModal(false);
      setAskMessages((prev) => [
        ...prev,
        studentMessage,
        {
          id: warningMessageId,
          role: "assistant",
          content:
            "Select a visible lesson first so JA can keep this help grounded to your class material.",
          blocked: false,
        },
      ]);
      return;
    }

    setBusy(true);
    setAskError("");
    setAskMessages((prev) => [...prev, studentMessage]);
    try {
      let threadId = askThreadId;
      if (!threadId || (askThreadClassId && askThreadClassId !== selectedClassId)) {
        const created = await jaService.createAskThread({
          classId: selectedClassId,
          lessonId: selectedLessonContext?.lessonId,
        });
        threadId = created.data.thread.id;
        setAskThreadId(threadId);
        setAskThreadClassId(created.data.thread.classId);
        setSelectedLessonContext(
          resolveThreadLessonContext(created.data.thread, selectedLessonContext),
        );
      }
      setActiveActivityKey(`ask:${threadId}`);
      const response = await jaService.sendAskMessage(threadId, {
        message: preset.label,
        quickAction: preset.label,
        lessonId: selectedLessonContext?.lessonId,
      });
      setAskMessages((prev) => [
        ...prev.filter((message) => message.id !== localMessageId),
        studentMessage,
        response.data.message,
      ]);
      setAskError("");
      if (response.data.blocked) setShowGuardrailModal(true);
      setAskThreadId(response.data.thread.id);
      setAskThreadClassId(response.data.thread.classId);
      setSelectedLessonContext(resolveThreadLessonContext(response.data.thread));
      syncAskThreadSummary(
        response.data.thread,
        response.data.message.createdAt ?? new Date().toISOString(),
      );
    } catch (error: unknown) {
      setAskMessages((prev) => prev.filter((message) => message.id !== localMessageId));
      const message = getApiErrorMessage(error, "JA Ask failed to respond.");
      setAskError(message);
      toast.error(message);
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to complete session."));
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
          className="ja-mode-panel ja-sidebar"
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
                    activeActivityKey === `${item.mode}:${item.id}` &&
                      !showHome &&
                      "is-selected",
                  )}
                >
                  <span className="ja-session-chip__top">
                    <span className={cn("ja-activity-tag", `mode-${item.mode}`)}>
                      {MODE_META[item.mode].title}
                    </span>
                    <span className="ja-session-chip__stamp">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <strong>{item.title}</strong>
                  <span className="ja-session-chip__subtitle">{item.subtitle}</span>
                  <span className="ja-session-chip__meta">
                    <span>{item.classLabel}</span>
                    <span>{item.status}</span>
                  </span>
                </button>
              ))
            )}
          </div>

        </motion.aside>
      ) : null}

      <motion.section className="ja-center-panel ja-main" {...motionProps.item}>
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
        <div className="ja-topbar ja-main-header">
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
                            void refreshHub(item.id, { resetContext: true });
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
            {mode === "ask" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="ja-head-link ja-new-chat-button"
                onClick={startNewAskChat}
              >
                <Sparkles className="h-4 w-4" />
                New chat
              </Button>
            ) : null}
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
              className="ja-thread-shell ja-chat-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="ja-thread-messages" aria-live="polite">
                <article className="ja-msg-row ja ja-intro-row">
                  <JaAssistantAvatar />
                  <div className="ja-bubble ja ja-intro-bubble">
                    <div className="ja-context-empty">
                      <div className="ja-context-empty__copy">
                        <p className="ja-eyebrow">Lesson-grounded chat</p>
                        <h3>Pick a visible lesson, then ask JA for help.</h3>
                        <p>
                          JA stays inside the lesson you select so explanations,
                          summaries, study plans, and review suggestions stay grounded
                          to what your class can currently access.
                        </p>
                      </div>

                      <div className="ja-context-picker" aria-label="Available lessons">
                        {askLessonContexts.length > 0 ? (
                          askLessonContexts.map((context) => {
                            const isSelected =
                              selectedLessonContext?.lessonId === context.lessonId;
                            return (
                              <button
                                key={context.lessonId}
                                type="button"
                                className={cn(
                                  "ja-context-chip",
                                  isSelected && "is-selected",
                                )}
                                onClick={() => selectAskLessonContext(context)}
                              >
                                <BookOpen className="h-4 w-4" />
                                <span className="ja-context-chip__copy">
                                  <strong>{context.title}</strong>
                                  {buildLessonContextLabel(context) ? (
                                    <span>{buildLessonContextLabel(context)}</span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="ja-context-empty__notice">
                            No visible lessons are available for JA Ask yet in this class.
                          </div>
                        )}
                      </div>

                      <div className="ja-guidelines">
                        <p className="ja-guidelines__title">Good prompts for JA</p>
                        <ul>
                          <li>Select one visible lesson card first.</li>
                          <li>
                            Use the bottom Ask button to choose one of JA&apos;s fixed
                            lesson actions.
                          </li>
                          {askGuidelines.map((guideline) => (
                            <li key={guideline}>{guideline}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>

                {askMessages.map((msg) => (
                  <article
                    key={msg.id}
                    className={cn(
                      "ja-msg-row",
                      msg.role === "student" ? "user" : "ja",
                    )}
                  >
                    {msg.role === "student" ? (
                      <span className="ja-msg-avatar user-av" aria-hidden="true">
                        ME
                      </span>
                    ) : (
                      <JaAssistantAvatar mood={msg.blocked ? "guarded" : "default"} />
                    )}
                    <div
                      className={cn(
                        "ja-bubble",
                        msg.role === "student" ? "user" : "ja",
                        msg.blocked && "notice",
                      )}
                    >
                      {msg.blocked ? (
                        <StudentStatusChip tone="warning">Guarded</StudentStatusChip>
                      ) : null}
                      <p>{msg.content}</p>
                    </div>
                  </article>
                ))}

                {busy ? (
                  <article className="ja-msg-row ja is-pending">
                    <JaAssistantAvatar mood="thinking" />
                    <div className="ja-bubble ja notice">
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking through your
                      question...
                    </div>
                  </article>
                ) : null}
                <div ref={askTailRef} />
              </div>

              {selectedLessonContext ? (
                <div className="ja-active-context" aria-live="polite">
                  <div className="ja-active-context__copy">
                    <span className="ja-active-context__label">Current lesson</span>
                    <strong>{selectedLessonContext.title}</strong>
                    {buildLessonContextLabel(selectedLessonContext) ? (
                      <span>{buildLessonContextLabel(selectedLessonContext)}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="ja-active-context__clear"
                    onClick={clearAskLessonContext}
                  >
                    <X className="h-4 w-4" />
                    Change lesson
                  </button>
                </div>
              ) : null}

              {askError ? (
                <div className="ja-ask-error" role="alert">
                  {askError}
                </div>
              ) : null}

              <div className="ja-composer ja-ask-launcher" ref={askMenuRef}>
                <div
                  className={cn(
                    "ja-ask-menu",
                    askMenuOpen && "is-open",
                  )}
                  role="dialog"
                  aria-label="Ask JA actions"
                  aria-hidden={!askMenuOpen}
                >
                  {ASK_PRESET_GROUPS.map((group) => (
                    <section key={group.id} className="ja-ask-menu__group">
                      <header className="ja-ask-menu__group-head">
                        <strong>{group.label}</strong>
                      </header>
                      <div className="ja-ask-menu__items">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="ja-ask-menu__item"
                            onClick={() => void sendAskPreset(item)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <Button
                  type="button"
                  disabled={busy}
                  className={cn(
                    "student-button-solid ja-send-button ja-prompt-button",
                    askMenuOpen && "is-open",
                  )}
                  onClick={() => setAskMenuOpen((current) => !current)}
                >
                  <MessageCircleQuestion className="h-4 w-4" />
                  Ask JA about this lesson
                </Button>
              </div>
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
                    <div className="ja-session-head__actions">
                      {mode === "review" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetReviewStage}
                          className="student-button-outline ja-secondary-action"
                        >
                          Back to replay menu
                        </Button>
                      ) : null}
                      <StudentStatusChip
                        tone={canComplete ? "success" : "info"}
                        className="ja-status-chip"
                      >
                        {currentSession.session.status === "completed"
                          ? "Completed"
                          : canComplete
                            ? "Ready to Complete"
                            : "In Progress"}
                      </StudentStatusChip>
                    </div>
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
                            Item {(activeItemIndex ?? 0) + 1} of {currentSession.items.length} |{" "}
                            {activeItem.itemType === "multiple_select"
                              ? "Multiple Select"
                              : "Single Select"}
                          </p>
                          <RichTextRenderer
                            html={activeItemPrompt.prompt}
                            className="ja-question-prompt"
                          />
                          {activeCoachText ? (
                            <aside className="ja-coach-card">
                              <span>JA Coach</span>
                              <p>{activeCoachText}</p>
                            </aside>
                          ) : null}
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
                                <RichTextRenderer
                                  html={option.text}
                                  className="ja-option-text"
                                />
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
                          {mode === "review" && currentSession.items.length > 1 ? (
                            <div className="ja-question-nav" aria-label="Replay question navigation">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setReviewCursor((current) => Math.max(0, current - 1))
                                }
                                disabled={busy || (activeItemIndex ?? 0) <= 0}
                                className="student-button-outline ja-secondary-action"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous item
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setReviewCursor((current) =>
                                    Math.min(currentSession.items.length - 1, current + 1),
                                  )
                                }
                                disabled={
                                  busy ||
                                  (activeItemIndex ?? 0) >= currentSession.items.length - 1
                                }
                                className="student-button-outline ja-secondary-action"
                              >
                                Next item
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span aria-hidden="true" />
                          )}

                          <div className="ja-question-actions__primary">
                            {mode === "practice" && !activeItem.response ? (
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
                            ) : null}

                            {mode === "review" &&
                            currentSession.session.status === "active" &&
                            !canComplete ? (
                              <Button
                                onClick={() => void submitCurrentAnswer()}
                                disabled={busy || !allSessionItemsReady}
                                className="student-button-solid ja-primary-action"
                              >
                                Submit Answers
                              </Button>
                            ) : null}

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

