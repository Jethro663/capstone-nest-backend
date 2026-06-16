import {
  buildAssessmentResponses,
  resolveAttemptTimer,
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
});
