import { aiApi } from "../services/ai";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("aiApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds tutor bootstrap URL with class filter", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          classes: [],
          selectedClassId: null,
          recentLessons: [],
          recentAttempts: [],
          recommendations: [],
          history: [],
        },
      },
    });

    await aiApi.getTutorBootstrap("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/ai/student/tutor/bootstrap?classId=class-1",
    );
  });

  it("starts tutor session through backend contract", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          sessionId: "session-1",
          stage: "lesson",
          completed: false,
          message: "Started",
          recommendation: {
            id: "rec-1",
            title: "Fractions",
            reason: "Weak score",
            focusText: "Focus on fractions",
          },
          lessonPlan: [],
          lessonBody: "Lesson body",
          questions: [],
          citations: [],
        },
      },
    });

    const payload = {
      classId: "class-1",
      recommendation: {
        id: "rec-1",
        title: "Fractions",
        reason: "Weak score",
        focusText: "Focus on fractions",
      },
    };

    const result = await aiApi.startTutorSession(payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/tutor/session",
      payload,
    );
    expect(result.sessionId).toBe("session-1");
  });

  it("posts follow-up tutor message to the session endpoint", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          sessionId: "session-1",
          stage: "practice",
          completed: false,
          message: "Next prompt",
          questions: [],
          citations: [],
        },
      },
    });

    await aiApi.sendTutorMessage("session-1", "Can you explain this again?");

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/tutor/session/session-1/message",
      {
        sessionId: "session-1",
        message: "Can you explain this again?",
      },
    );
  });

  it("normalizes intervention job creation like the web service", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          jobId: "job-1",
          jobType: "intervention_recommendation",
          status: "completed",
          progressPercent: "100",
          statusMessage: "Done",
          outputId: "output-1",
        },
      },
    });

    const result = await aiApi.createInterventionJob("case-1", { note: "Focus on fractions" });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/teacher/interventions/case-1/jobs",
      { note: "Focus on fractions" },
    );
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("completed");
    expect(result.progressPercent).toBe(100);
    expect(result.message).toBe("Done");
  });

  it("returns a safe fallback for malformed intervention job results", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: {
          job: { jobId: "job-1", status: "completed", outputId: "output-1" },
          result: {
            outputId: "output-1",
            outputType: "intervention_recommendation",
            structuredOutput: null,
          },
        },
      },
    });

    const result = await aiApi.getInterventionJobResult("job-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/ai/teacher/jobs/job-1/result");
    expect(result.job.id).toBe("job-1");
    expect(result.result?.structuredOutput?.recommendedLessons).toEqual([]);
    expect(result.result?.structuredOutput?.aiSummary.summary).toContain("temporarily unavailable");
  });

  it("creates a quiz draft with explicit published indexed source ids", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          jobId: "quiz-job-1",
          status: "queued",
        },
      },
    });

    await aiApi.createQuizDraftJob({
      classId: "class-1",
      title: "  Fractions check  ",
      questionCount: 99,
      questionType: "multiple_choice",
      teacherNote: "  Focus on equivalent fractions  ",
      lessonIds: ["lesson-1"],
      extractionIds: ["extraction-1"],
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/teacher/quizzes/jobs",
      expect.objectContaining({
        classId: "class-1",
        title: "Fractions check",
        questionCount: 15,
        teacherNote: "Focus on equivalent fractions",
        sourcePolicy: "published_default",
        allowDraftSources: false,
        lessonIds: ["lesson-1"],
        extractionIds: ["extraction-1"],
      }),
    );
  });

  it("uses the long-running timeout when reindexing a class", async () => {
    mockedApiClient.post.mockResolvedValue({ data: { data: { classId: "class-1" } } });

    await aiApi.reindexClass("class-1");

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/index/classes/class-1",
      undefined,
      { timeout: 150_000 },
    );
  });

  it("exposes quiz draft review, retry, cancel, and apply contracts", async () => {
    mockedApiClient.patch.mockResolvedValue({
      data: { data: { jobId: "quiz-job-1", status: "completed" } },
    });
    mockedApiClient.post
      .mockResolvedValueOnce({
        data: { data: { jobId: "quiz-job-1", canApply: true, blockedReasons: [] } },
      })
      .mockResolvedValueOnce({
        data: { data: { jobId: "quiz-job-2", status: "queued" } },
      })
      .mockResolvedValueOnce({
        data: { data: { jobId: "quiz-job-2", status: "cancelled" } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            jobId: "quiz-job-1",
            alreadyApplied: false,
            applyResult: { assessmentId: "assessment-1" },
          },
        },
      });

    const structuredOutput = {
      title: "Reviewed draft",
      questions: [{ content: "One half equals?", type: "multiple_choice", reviewed: true }],
    };
    await aiApi.updateQuizDraft("quiz-job-1", { structuredOutput });
    const preview = await aiApi.previewQuizDraftApply("quiz-job-1");
    const retry = await aiApi.retryQuizDraftJob("quiz-job-1");
    const cancel = await aiApi.cancelQuizDraftJob("quiz-job-2");
    const applied = await aiApi.applyQuizDraftJob("quiz-job-1");

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/ai/teacher/quizzes/jobs/quiz-job-1/draft",
      { structuredOutput },
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      "/ai/teacher/quizzes/jobs/quiz-job-1/apply/preview",
      {},
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      "/ai/teacher/quizzes/jobs/quiz-job-1/retry",
      {},
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      3,
      "/ai/teacher/quizzes/jobs/quiz-job-2/cancel",
      {},
    );
    expect(preview.canApply).toBe(true);
    expect(retry.id).toBe("quiz-job-2");
    expect(cancel.status).toBe("cancelled");
    expect(applied.applyResult.assessmentId).toBe("assessment-1");
  });
});
