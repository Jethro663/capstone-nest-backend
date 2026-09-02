import {
  buildAssessmentResponses,
  orderAttemptQuestions,
  resolveAttemptTimer,
  resolveCurrentQuestionIndex,
  resolveQuestionDeadlineAction,
  resolveQuestionTimer,
  resolveSubmittedAttemptState,
  resolveViolationState,
  restoreDraftResponses,
  validateUploadBundle,
} from "../assessmentFlow";

describe("assessment flow utilities", () => {
  it("restores backend draft responses into answer state", () => {
    expect(
      restoreDraftResponses([
        { questionId: "q1", selectedOptionId: "a" },
        { questionId: "q2", selectedOptionIds: ["b", "c"] },
        { questionId: "q3", studentAnswer: "Explain it" },
      ]),
    ).toEqual({
      q1: "a",
      q2: ["b", "c"],
      q3: "Explain it",
    });
  });

  it("builds response payloads for objective and text question types", () => {
    const responses = buildAssessmentResponses(
      [
        { id: "q1", type: "multiple_choice" },
        { id: "q2", type: "multiple_select" },
        { id: "q3", type: "fill_blank" },
      ],
      { q1: "a", q2: ["b", "c"], q3: "Jose Rizal" },
    );

    expect(responses).toEqual([
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionIds: ["b", "c"] },
      { questionId: "q3", studentAnswer: "Jose Rizal" },
    ]);
  });

  it("validates a multi-file bundle against the 25mb limit", () => {
    expect(
      validateUploadBundle(
        [
          { name: "photo.jpg", size: 4 * 1024 * 1024, mimeType: "image/jpeg" },
          { name: "work.pdf", size: 6 * 1024 * 1024, mimeType: "application/pdf" },
        ],
        { maxBytes: 25 * 1024 * 1024, allowedExtensions: ["jpg", "pdf"], allowedMimeTypes: ["image/jpeg", "application/pdf"] },
      ),
    ).toEqual({ ok: true, totalBytes: 10 * 1024 * 1024 });

    expect(
      validateUploadBundle(
        [{ name: "huge.pdf", size: 26 * 1024 * 1024, mimeType: "application/pdf" }],
        { maxBytes: 25 * 1024 * 1024, allowedExtensions: ["pdf"], allowedMimeTypes: ["application/pdf"] },
      ),
    ).toEqual({ ok: false, reason: "Files must be 25 MB or smaller in total.", totalBytes: 26 * 1024 * 1024 });
  });

  it("uses server expiry as the authoritative timer target", () => {
    const expiresAt = new Date(Date.now() + 65_000).toISOString();
    const timer = resolveAttemptTimer({ expiresAt, timeLimitMinutes: 10 }, Date.now());

    expect(timer.source).toBe("server");
    expect(timer.secondsRemaining).toBeGreaterThan(50);
    expect(timer.secondsRemaining).toBeLessThanOrEqual(65);
  });

  it("locks the attempt on the third anti-cheat violation", () => {
    expect(resolveViolationState(0)).toEqual({ nextCount: 1, locked: false });
    expect(resolveViolationState(2)).toEqual({ nextCount: 3, locked: true });
  });

  it("projects questions using the backend attempt order and preserves unknown fallbacks", () => {
    const questions = [
      { id: "q1", type: "short_answer" as const, order: 1 },
      { id: "q2", type: "short_answer" as const, order: 2 },
      { id: "q3", type: "short_answer" as const, order: 3 },
    ];

    expect(orderAttemptQuestions(questions, ["q3", "q1"])).toEqual([
      questions[2],
      questions[0],
      questions[1],
    ]);
    expect(orderAttemptQuestions(questions, null)).toEqual(questions);
  });

  it("uses the server question deadline and recalculates after foreground resume", () => {
    const deadline = "2026-09-02T00:01:00.000Z";

    expect(resolveQuestionTimer(true, deadline, Date.parse("2026-09-02T00:00:40.000Z"))).toEqual({
      secondsRemaining: 20,
      deadlineAt: deadline,
    });
    expect(resolveQuestionTimer(true, deadline, Date.parse("2026-09-02T00:01:05.000Z"))).toEqual({
      secondsRemaining: 0,
      deadlineAt: deadline,
    });
    expect(resolveQuestionTimer(false, deadline, Date.parse("2026-09-02T00:00:40.000Z"))).toEqual({
      secondsRemaining: null,
      deadlineAt: null,
    });
  });

  it("clamps resumed navigation and resolves deadline behavior", () => {
    expect(resolveCurrentQuestionIndex(7, 3)).toBe(2);
    expect(resolveCurrentQuestionIndex(-1, 3)).toBe(0);
    expect(resolveQuestionDeadlineAction(0, 3)).toBe("advance");
    expect(resolveQuestionDeadlineAction(2, 3)).toBe("submit");
  });

  it("treats backend submission as terminal even when the local mutation is idle", () => {
    expect(resolveSubmittedAttemptState({ isSubmitted: true, violationCount: 0 })).toEqual({
      submitted: true,
      locked: true,
    });
    expect(resolveSubmittedAttemptState({ isSubmitted: false, violationCount: 3 })).toEqual({
      submitted: false,
      locked: true,
    });
  });
});
