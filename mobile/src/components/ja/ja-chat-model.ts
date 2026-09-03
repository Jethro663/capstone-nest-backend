import type {
  JaAskLessonContextSummary,
  JaAskThreadSummary,
} from "../../types/ja";

export type JaAskPresetAction = {
  id: string;
  label: string;
};

export type JaAskPresetGroup = {
  id: string;
  label: string;
  items: JaAskPresetAction[];
};

export const JA_ASK_PRESET_GROUPS: JaAskPresetGroup[] = [
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

export type JaChatEntryState =
  | { mode: "resume-pending" }
  | { mode: "resume-loading"; threadId: string }
  | { mode: "new" }
  | { mode: "active"; threadId: string };

export type JaLessonSelection =
  | { kind: "selected"; lesson: JaAskLessonContextSummary }
  | { kind: "requires-selection" }
  | { kind: "unavailable" }
  | { kind: "stale"; lessonId: string };

export function createResumePendingState(): JaChatEntryState {
  return { mode: "resume-pending" };
}

export function startNewChatState(): JaChatEntryState {
  return { mode: "new" };
}

export function activateThreadState(threadId: string): JaChatEntryState {
  return { mode: "active", threadId };
}

export function selectLatestActiveThread(
  threads: JaAskThreadSummary[],
): JaAskThreadSummary | undefined {
  return threads
    .filter((thread) => thread.status === "active")
    .reduce<JaAskThreadSummary | undefined>((latest, thread) => {
      if (!latest) return thread;
      return Date.parse(thread.updatedAt) > Date.parse(latest.updatedAt) ? thread : latest;
    }, undefined);
}

export function resolveResumeState(
  state: JaChatEntryState,
  threads: JaAskThreadSummary[],
): JaChatEntryState {
  if (state.mode !== "resume-pending") return state;
  const latest = selectLatestActiveThread(threads);
  return latest
    ? { mode: "resume-loading", threadId: latest.id }
    : startNewChatState();
}

export function resolveLessonSelection(
  lessons: JaAskLessonContextSummary[],
  currentLessonId?: string | null,
): JaLessonSelection {
  if (currentLessonId) {
    const current = lessons.find((lesson) => lesson.lessonId === currentLessonId);
    return current
      ? { kind: "selected", lesson: current }
      : { kind: "stale", lessonId: currentLessonId };
  }

  if (lessons.length === 0) return { kind: "unavailable" };
  if (lessons.length === 1) return { kind: "selected", lesson: lessons[0] };
  return { kind: "requires-selection" };
}
