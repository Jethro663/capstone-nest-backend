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
  CircleHelp,
  CircleDot,
  LockKeyhole,
  Loader2,
  Menu,
  MessageCircleQuestion,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { AiOutageNotice } from "@/components/student/AiOutageNotice";
import { StudentJaHubGuideDialog } from "@/components/student/ja/StudentJaHubGuideDialog";
import { toast } from "sonner";
import { getMotionProps } from "@/components/student/student-motion";
import { StudentStatusChip } from "@/components/student/student-primitives";
import { StudentObjectiveAssessmentSurface } from "@/components/student/assessment/StudentObjectiveAssessmentSurface";
import { RichTextRenderer } from "@/components/shared/rich-text/RichTextRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { normalizeRichText } from "@/lib/rich-text";
import { jaService } from "@/services/ja-service";
import { useAiAvailability } from "@/hooks/use-ai-availability";
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
type JaVisibleMode = Extract<JaMode, "ask" | "review">;
type JaActivityFilter = "all" | JaVisibleMode;

interface JaActivityItem {
  id: string;
  mode: JaVisibleMode;
  title: string;
  subtitle: string;
  classLabel: string;
  status: string;
  updatedAt: string;
}

type JaAssistantTone = "grounded" | "guarded" | "thin-evidence";

const MODE_ORDER: JaVisibleMode[] = ["ask", "review"];
const JA_INLINE_ACTIONS: JaAskPresetAction[] = [
  { id: "inline-explain-simpler", label: "Explain simpler" },
  { id: "inline-give-analogy", label: "Give analogy" },
  { id: "inline-quiz-me", label: "Quiz me" },
  { id: "inline-study-next", label: "What should I study next?" },
];
const JA_THIN_EVIDENCE_PATTERN =
  /i do not have enough readable class evidence|i cannot answer that confidently|pick one visible lesson|avoids filling gaps with unsupported guesses|would rather be explicit about weak evidence/i;

const MODE_META: Record<
  JaVisibleMode,
  {
    title: string;
    subtitle: string;
    icon: typeof MessageCircleQuestion;
    kicker: string;
  }
> = {
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
  celebrate: "/images/JA/ja_cheer.png",
  guarded: "/images/JA/ja_sad.png",
  surprised: "/images/JA/ja_shock.png",
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

function isJaMode(value: string | null | undefined): value is JaVisibleMode {
  return value === "ask" || value === "review";
}

function itemReady(item: JaPracticeSessionItem, selected: string[] | undefined) {
  if (!selected || selected.length === 0) return false;
  return item.itemType === "multiple_select" ? selected.length > 0 : Boolean(selected[0]);
}

function getAssistantTone(message: JaAskMessage): JaAssistantTone {
  if (message.blocked) return "guarded";
  if (
    message.insufficientEvidence ||
    (Array.isArray(message.citations) &&
      message.citations.length === 0 &&
      JA_THIN_EVIDENCE_PATTERN.test(message.content))
  ) {
    return "thin-evidence";
  }
  return "grounded";
}

function getAssistantToneLabel(tone: JaAssistantTone) {
  if (tone === "guarded") {
    return {
      chipTone: "warning" as const,
      label: "Guarded",
      subtitle: "Safety first",
    };
  }
  if (tone === "thin-evidence") {
    return {
      chipTone: "info" as const,
      label: "Thin evidence",
      subtitle: "Needs clearer class material",
    };
  }
  return {
    chipTone: "success" as const,
    label: "Grounded",
    subtitle: "Based on your class",
  };
}

function readCitationValue(citation: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = citation[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatCitationSource(sourceType: string) {
  return sourceType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeJaAssistantContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes('"html"')) {
    return normalizeRichText(content);
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return normalizeRichText(content);
    }

    const heading = typeof parsed.heading === "string" ? parsed.heading.trim() : "";
    const html =
      typeof parsed.html === "string"
        ? parsed.html.trim()
        : typeof parsed.text === "string"
          ? parsed.text.trim()
          : "";

    if (!heading && !html) {
      return normalizeRichText(content);
    }

    return normalizeRichText(
      `${heading ? `<h3>${escapeHtml(heading)}</h3>` : ""}${html}`,
    );
  } catch {
    return normalizeRichText(content);
  }
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
  const aiAvailability = useAiAvailability();
  const aiUnavailable = aiAvailability.status === "degraded";
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
  const [mode, setMode] = useState<JaVisibleMode>(
    isJaMode(initialMode) ? initialMode : "ask",
  );
  const [showHome, setShowHome] = useState(false);
  const [guideResetToken, setGuideResetToken] = useState(0);
  const [guideOpen, setGuideOpen] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classSelectorOpen, setClassSelectorOpen] = useState(
    !(initialClassId && initialEntry && initialEntry !== "sidebar"),
  );
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [activityFilter, setActivityFilter] = useState<JaActivityFilter>("all");
  const [activeActivityKey, setActiveActivityKey] = useState("");

  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewCursor, setReviewCursor] = useState(0);
  const [reviewSessionTitle, setReviewSessionTitle] = useState("Assessment Replay");
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
    setReviewSessionTitle("Assessment Replay");
    setActiveActivityKey("");
  }, [clearAnswersForItems, reviewSession]);

  const startNewAskChat = useCallback(() => {
    if (aiUnavailable) return;
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
  }, [aiUnavailable, selectedClassId]);

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
    const activeSession = mode === "review" ? reviewSession : null;
    if (!activeSession || activeSession.session.status !== "active") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      void jaService.logReviewEvent(activeSession.session.id, "focus_strike", {
        reason: "visibility_hidden",
        at: new Date().toISOString(),
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [mode, reviewSession]);

  const currentSession = mode === "review" ? reviewSession : null;
  const activeItemIndex = useMemo(() => {
    if (!currentSession) return null;
    if (currentSession.items.length === 0) return -1;
    return Math.min(Math.max(reviewCursor, 0), currentSession.items.length - 1);
  }, [currentSession, reviewCursor]);

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
  const sessionAnsweredById = useMemo(
    () =>
      currentSession
        ? Object.fromEntries(
            currentSession.items.map((item) => [
              item.id,
              Boolean(item.response) || itemReady(item, answers[item.id]),
            ]),
          )
        : {},
    [answers, currentSession],
  );
  const draftAnsweredCount = useMemo(
    () =>
      currentSession?.items.filter((item) => Boolean(sessionAnsweredById[item.id]))
        .length ?? 0,
    [currentSession, sessionAnsweredById],
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
        ((mode === "review" ? draftAnsweredCount : answeredCount) /
          Math.max(currentSession.session.questionCount, 1)) *
          100,
      )
    : 0;

  const modeCount = useMemo(() => {
    if (!hub) return { ask: 0, review: 0 };
    return {
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
    const reviewItems = (hub.review.sessions ?? []).map((session) => ({
      id: session.id,
      mode: "review" as const,
      title: "Assessment Replay",
      subtitle: getSessionSubtitle(session),
      classLabel: className,
      status: session.status.toUpperCase(),
      updatedAt: session.completedAt || session.startedAt,
    }));
    return [...askItems, ...reviewItems].sort(
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
  const activeActivity = useMemo(
    () =>
      activityItems.find((item) => `${item.mode}:${item.id}` === activeActivityKey) ??
      null,
    [activityItems, activeActivityKey],
  );
  const askLessonContexts = hub?.ask.lessonContexts ?? [];
  const askGuidelines = hub?.ask.guidelines?.length
    ? hub.ask.guidelines
    : DEFAULT_JA_ASK_GUIDELINES;

  const loadReviewSession = async (sessionId: string) => {
    try {
      setActiveActivityKey(`review:${sessionId}`);
      const res = await jaService.getReviewSession(sessionId);
      setReviewSession(res.data);
      setReviewCursor(0);

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

  const selectMode = (nextMode: JaVisibleMode) => {
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
    void loadReviewSession(item.id);
  };

  const selectAskLessonContext = (context: JaAskLessonContextSummary) => {
    if (aiUnavailable) return;
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
    if (aiUnavailable) return;
    setSelectedLessonContext(null);
    setAskThreadId("");
    setAskThreadClassId(selectedClassId);
    setAskMessages([]);
    setAskError("");
    setAskMenuOpen(false);
    setShowGuardrailModal(false);
    setActiveActivityKey("");
  };

  const startReview = async (attemptId: string) => {
    if (aiUnavailable) return;
    if (!selectedClassId) return;
    setBusy(true);
    try {
      const attemptSummary = hub?.review.eligibleAttempts.find(
        (attempt) => attempt.attemptId === attemptId,
      );
      setReviewSessionTitle(attemptSummary?.assessmentTitle || "Assessment Replay");
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
    if (aiUnavailable) return;
    if (!currentSession || !activeItem) return;
    setBusy(true);
    try {
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
      await loadReviewSession(currentSession.session.id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save answer."));
    } finally {
      setBusy(false);
    }
  };

  const sendAskPreset = async (preset: JaAskPresetAction) => {
    if (aiUnavailable) return;
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
          content: [
            "## Main idea",
            "Select a visible lesson first so JA can keep this help grounded to your class material.",
            "",
            "## Try this now",
            "- Choose one lesson card before asking for a summary, explanation, quiz, or study plan.",
          ].join("\n"),
          blocked: false,
          insufficientEvidence: true,
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
      const assistantMessage: JaAskMessage = {
        ...response.data.message,
        insufficientEvidence: response.data.insufficientEvidence,
      };
      setAskMessages((prev) => [
        ...prev.filter((message) => message.id !== localMessageId),
        studentMessage,
        assistantMessage,
      ]);
      setAskError("");
      if (response.data.blocked) setShowGuardrailModal(true);
      setAskThreadId(response.data.thread.id);
      setAskThreadClassId(response.data.thread.classId);
      setSelectedLessonContext(resolveThreadLessonContext(response.data.thread));
      syncAskThreadSummary(
        response.data.thread,
        assistantMessage.createdAt ?? new Date().toISOString(),
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
    if (aiUnavailable) return;
    if (!currentSession) return;
    setBusy(true);
    try {
      await jaService.completeReviewSession(currentSession.session.id);
      await loadReviewSession(currentSession.session.id);
      await refreshHub(selectedClassId);
      toast.success("Session completed.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to complete session."));
    } finally {
      setBusy(false);
    }
  };

  const liveJaState = useMemo<{
    mood: keyof typeof JA_AVATAR_IMAGES;
    caption: string;
    key: string;
    talking: boolean;
  }>(() => {
    const latestAssistant =
      [...askMessages].reverse().find((message) => message.role !== "student") ?? null;
    const latestStudent =
      [...askMessages].reverse().find((message) => message.role === "student") ?? null;

    if (busy) {
      return {
        mood: "thinking",
        caption: "Thinking through your lesson...",
        key: `thinking-${latestStudent?.id ?? askMessages.length}`,
        talking: true,
      };
    }

    if (latestAssistant?.blocked) {
      return {
        mood: "guarded",
        caption: "Let's keep it safe and class-grounded.",
        key: `guarded-${latestAssistant.id}`,
        talking: true,
      };
    }

    if (latestAssistant) {
      const tone = getAssistantTone(latestAssistant);
      if (tone === "thin-evidence") {
        return {
          mood: "surprised",
          caption: "I need a clearer lesson clue.",
          key: `thin-${latestAssistant.id}`,
          talking: true,
        };
      }
      if (tone === "guarded") {
        return {
          mood: "guarded",
          caption: "Let's stay with your class material.",
          key: `guarded-${latestAssistant.id}`,
          talking: true,
        };
      }
      return {
        mood: "celebrate",
        caption: "Nice, I found a path through it.",
        key: `celebrate-${latestAssistant.id}`,
        talking: true,
      };
    }

    if (latestStudent) {
      return {
        mood: "surprised",
        caption: "I'm listening. Let's solve it.",
        key: `listening-${latestStudent.id}`,
        talking: true,
      };
    }

    return {
      mood: "default",
      caption: "Choose a lesson, then ask me anything.",
      key: "idle",
      talking: false,
    };
  }, [askMessages, busy]);

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
        <StudentJaHubGuideDialog
          key={guideResetToken}
          open={guideOpen}
          onOpenChange={setGuideOpen}
        />
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
            {aiUnavailable ? (
              <span className="ja-ai-offline-pill">AI offline</span>
            ) : null}
          </div>
          <div className="ja-topbar__actions">
            <button
              type="button"
              className="ja-head-link ja-guide-trigger"
              onClick={() => {
                setGuideResetToken((current) => current + 1);
                setGuideOpen(true);
              }}
            >
              <CircleHelp className="h-4 w-4" />
              JA guide
            </button>
            {mode === "ask" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || aiUnavailable}
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

        {aiUnavailable ? (
          <AiOutageNotice
            className="ja-outage-notice"
            message={aiAvailability.message}
          />
        ) : null}

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
              <div className="ja-home-hero">
                <div className="ja-home-copy">
                  <p className="ja-eyebrow">Pick your study boost</p>
                  <h2>Tell JA what feels confusing, then watch the lesson click.</h2>
                  <p>
                    Choose a mode and JA will turn this class into simpler explanations,
                    sharper review questions, and a study path that feels easier to start.
                  </p>
                  <div className="ja-home-sparkline" aria-label="JA study strengths">
                    <span>Explain it simply</span>
                    <span>Quiz me fast</span>
                    <span>Find my weak spots</span>
                  </div>
                </div>
                <div className="ja-home-figure" aria-hidden="true">
                  <span className="ja-home-orb ja-home-orb--one" />
                  <span className="ja-home-orb ja-home-orb--two" />
                  <Image
                    src={JA_AVATAR_IMAGES.default}
                    alt=""
                    width={420}
                    height={420}
                    className="ja-home-robot"
                    priority
                  />
                  <span className="ja-home-bubble ja-home-bubble--ask">Ask me anything</span>
                  <span className="ja-home-bubble ja-home-bubble--review">Replay mistakes</span>
                </div>
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
                                disabled={aiUnavailable}
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

                {askMessages.map((msg) => {
                  const isStudentMessage = msg.role === "student";
                  const tone = isStudentMessage ? null : getAssistantTone(msg);
                  const toneMeta = tone ? getAssistantToneLabel(tone) : null;
                  const citations = Array.isArray(msg.citations) ? msg.citations : [];
                  const inlineActions =
                    !isStudentMessage && !msg.blocked ? JA_INLINE_ACTIONS : [];

                  return (
                    <article
                      key={msg.id}
                      className={cn("ja-msg-row", isStudentMessage ? "user" : "ja")}
                    >
                      {isStudentMessage ? (
                        <span className="ja-msg-avatar user-av" aria-hidden="true">
                          ME
                        </span>
                      ) : (
                        <JaAssistantAvatar mood={msg.blocked ? "guarded" : "default"} />
                      )}
                      <div
                        className={cn(
                          "ja-bubble",
                          isStudentMessage ? "user" : "ja",
                          isStudentMessage && "ja-bubble--student",
                          tone === "grounded" && "ja-bubble--grounded",
                          tone === "thin-evidence" && "ja-bubble--thin-evidence",
                          tone === "guarded" && "ja-bubble--guarded",
                          msg.blocked && "notice",
                        )}
                      >
                        {isStudentMessage ? (
                          <p>{msg.content}</p>
                        ) : (
                          <>
                            {toneMeta ? (
                              <div className="ja-bubble__meta">
                                <div className="ja-bubble__speaker">
                                  <span>JA Coach</span>
                                  <small>{toneMeta.subtitle}</small>
                                </div>
                                <StudentStatusChip tone={toneMeta.chipTone}>
                                  {toneMeta.label}
                                </StudentStatusChip>
                              </div>
                            ) : null}

                            <RichTextRenderer
                              html={normalizeJaAssistantContent(msg.content)}
                              className="ja-bubble__content"
                            />

                            {citations.length > 0 ? (
                              <div className="ja-bubble__evidence">
                                <div className="ja-bubble__evidence-head">
                                  <BookOpen className="h-4 w-4" />
                                  <span>From your class</span>
                                </div>
                                <div className="ja-bubble__evidence-list">
                                  {citations.map((entry, index) => {
                                    const citation =
                                      entry && typeof entry === "object"
                                        ? (entry as Record<string, unknown>)
                                        : {};
                                    const label = readCitationValue(citation, [
                                      "label",
                                      "lessonTitle",
                                      "assessmentTitle",
                                      "title",
                                    ]);
                                    const snippet = readCitationValue(citation, [
                                      "snippet",
                                      "chunkText",
                                    ]);
                                    const sourceType = readCitationValue(citation, [
                                      "sourceType",
                                    ]);

                                    return (
                                      <article
                                        key={`${msg.id}-citation-${index}`}
                                        className="ja-evidence-card"
                                      >
                                        <strong>{label || "Class material"}</strong>
                                        {snippet ? <p>{snippet}</p> : null}
                                        {sourceType ? (
                                          <span>{formatCitationSource(sourceType)}</span>
                                        ) : null}
                                      </article>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            {inlineActions.length > 0 ? (
                              <div className="ja-bubble__actions" aria-label="Suggested follow-ups">
                                {inlineActions.map((action) => (
                                  <button
                                    key={`${msg.id}-${action.id}`}
                                    type="button"
                                    className="ja-bubble__action"
                                    onClick={() => void sendAskPreset(action)}
                                    disabled={busy || aiUnavailable}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}

                {busy ? (
                  <article className="ja-msg-row ja is-pending">
                    <JaAssistantAvatar mood="thinking" />
                    <div className="ja-bubble ja notice ja-bubble--pending">
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking through your
                      question and grounding it to your class material...
                    </div>
                  </article>
                ) : null}
                <div ref={askTailRef} />
              </div>

              <div
                key={liveJaState.key}
                className={cn(
                  "ja-live-companion",
                  `is-${liveJaState.mood}`,
                  liveJaState.talking && "is-talking",
                  askMessages.length > 0 && "has-chat",
                )}
                aria-hidden="true"
              >
                <span className="ja-live-companion__halo" />
                <Image
                  src={JA_AVATAR_IMAGES[liveJaState.mood]}
                  alt=""
                  width={520}
                  height={520}
                  sizes="(max-width: 640px) 10rem, (max-width: 920px) 14rem, 24rem"
                  className="ja-live-companion__image"
                />
                <span className="ja-live-companion__caption">{liveJaState.caption}</span>
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
                            disabled={aiUnavailable}
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
                  disabled={busy || aiUnavailable}
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
                          disabled={aiUnavailable}
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
                </div>
              ) : (
                <div className="ja-session-active student-panel">
                  {mode === "review" && activeItem ? (
                    <>
                      <div className="ja-session-head">
                        <div>
                          <p className="ja-eyebrow">Replay</p>
                          <h3>{reviewSessionTitle || activeActivity?.title || "Assessment Replay"}</h3>
                        </div>
                        <div className="ja-session-head__actions">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetReviewStage}
                            className="student-button-outline ja-secondary-action"
                          >
                            Back to replay menu
                          </Button>
                        </div>
                      </div>

                      <StudentObjectiveAssessmentSurface
                        title={reviewSessionTitle || activeActivity?.title || "Assessment Replay"}
                        questionLabel={`Question ${(activeItemIndex ?? 0) + 1} of ${currentSession.items.length}`}
                        progressValue={sessionProgressPercent}
                        statusChips={
                          <>
                            <StudentStatusChip tone="info">
                              {draftAnsweredCount}/{currentSession.items.length} answered
                            </StudentStatusChip>
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
                          </>
                        }
                        question={{
                          id: activeItem.id,
                          type:
                            activeItem.itemType === "multiple_select"
                              ? "multiple_select"
                              : "multiple_choice",
                          promptHtml: activeItemPrompt.prompt,
                          options: (activeItem.options ?? []).map((option) => ({
                            id: option.id,
                            text: option.text,
                          })),
                        }}
                        currentIdx={activeItemIndex ?? 0}
                        questionIds={currentSession.items.map((item) => item.id)}
                        answeredById={sessionAnsweredById}
                        navigationLocked={false}
                        value={
                          activeItem.itemType === "multiple_select"
                            ? answers[activeItem.id] ?? []
                            : answers[activeItem.id]?.[0] ?? ""
                        }
                        onChange={(val) => {
                          setAnswers((prev) => ({
                            ...prev,
                            [activeItem.id]: Array.isArray(val)
                              ? val
                              : val
                                ? [val]
                                : [],
                          }));
                        }}
                        onNavigate={(index) => setReviewCursor(index)}
                        optionTextMode="rich"
                        metaBadges={
                          <>
                            <Badge variant="outline" className="capitalize">
                              {activeItem.itemType === "multiple_select"
                                ? "multiple select"
                                : "multiple choice"}
                            </Badge>
                            <Badge variant="secondary">Replay</Badge>
                          </>
                        }
                        promptSupplement={
                          activeCoachText ? (
                            <aside className="ja-coach-card">
                              <span>JA Coach</span>
                              <p>{activeCoachText}</p>
                            </aside>
                          ) : null
                        }
                        feedback={
                          activeItem.response ? (
                            <div
                              className={cn(
                                "ja-feedback",
                                activeItem.response.isCorrect
                                  ? "is-correct"
                                  : "is-incorrect",
                              )}
                            >
                              {activeItem.response.feedback}
                            </div>
                          ) : null
                        }
                        footerLeft={
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setReviewCursor((current) => Math.max(0, current - 1))
                            }
                            disabled={busy || (activeItemIndex ?? 0) <= 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                        }
                        footerRight={
                          (activeItemIndex ?? 0) < currentSession.items.length - 1 ? (
                            <Button
                              type="button"
                              className="student-button-solid"
                              onClick={() =>
                                setReviewCursor((current) =>
                                  Math.min(currentSession.items.length - 1, current + 1),
                                )
                              }
                              disabled={
                                busy ||
                                (activeItemIndex ?? 0) >= currentSession.items.length - 1
                              }
                            >
                              Next
                            </Button>
                          ) : canComplete ? (
                            <Button
                              type="button"
                              className="student-button-solid"
                              onClick={() => void completeCurrentSession()}
                              disabled={busy || aiUnavailable}
                            >
                              Complete Session
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              className="student-button-solid"
                              onClick={() => void submitCurrentAnswer()}
                              disabled={busy || aiUnavailable || !allSessionItemsReady}
                            >
                              Submit Answers
                            </Button>
                          )
                        }
                      />
                    </>
                  ) : activeItem ? (
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
                                  if (aiUnavailable) return;
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
                                disabled={aiUnavailable || Boolean(activeItem.response)}
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
                            {mode === "review" &&
                            currentSession.session.status === "active" &&
                            !canComplete ? (
                              <Button
                                onClick={() => void submitCurrentAnswer()}
                                disabled={busy || aiUnavailable || !allSessionItemsReady}
                                className="student-button-solid ja-primary-action"
                              >
                                Submit Answers
                              </Button>
                            ) : null}

                            {canComplete ? (
                              <Button
                                variant="outline"
                                onClick={() => void completeCurrentSession()}
                                disabled={busy || aiUnavailable}
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

