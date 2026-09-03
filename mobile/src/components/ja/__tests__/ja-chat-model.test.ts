import {
  createResumePendingState,
  resolveLessonSelection,
  resolveResumeState,
  selectLatestActiveThread,
  startNewChatState,
} from "../ja-chat-model";
import type { JaAskLessonContextSummary, JaAskThreadSummary } from "../../../types/ja";

const threads: JaAskThreadSummary[] = [
  {
    id: "archived-newest",
    title: "Archived",
    status: "archived",
    updatedAt: "2026-09-03T12:00:00.000Z",
  },
  {
    id: "active-older",
    title: "Older",
    status: "active",
    updatedAt: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "active-latest",
    title: "Latest",
    status: "active",
    updatedAt: "2026-09-02T12:00:00.000Z",
  },
];

const lessons: JaAskLessonContextSummary[] = [
  { lessonId: "lesson-1", title: "Fractions" },
  { lessonId: "lesson-2", title: "Decimals" },
];

describe("JAHUB chat model", () => {
  it("selects the most recently updated active thread", () => {
    expect(selectLatestActiveThread(threads)?.id).toBe("active-latest");
  });

  it("resolves pending resume to the latest thread or a new chat", () => {
    expect(resolveResumeState(createResumePendingState(), threads)).toEqual({
      mode: "resume-loading",
      threadId: "active-latest",
    });
    expect(resolveResumeState(createResumePendingState(), [])).toEqual({ mode: "new" });
  });

  it("keeps New Chat from reopening the previous thread", () => {
    const state = startNewChatState();

    expect(resolveResumeState(state, threads)).toBe(state);
    expect(state).toEqual({ mode: "new" });
  });

  it("auto-selects exactly one lesson", () => {
    expect(resolveLessonSelection([lessons[0]])).toEqual({
      kind: "selected",
      lesson: lessons[0],
    });
  });

  it("requires explicit selection when multiple lessons are visible", () => {
    expect(resolveLessonSelection(lessons)).toEqual({ kind: "requires-selection" });
  });

  it("reports when no lessons are available", () => {
    expect(resolveLessonSelection([])).toEqual({ kind: "unavailable" });
  });

  it("marks a resumed lesson missing from visible contexts as stale", () => {
    expect(resolveLessonSelection(lessons, "removed-lesson")).toEqual({
      kind: "stale",
      lessonId: "removed-lesson",
    });
  });
});
