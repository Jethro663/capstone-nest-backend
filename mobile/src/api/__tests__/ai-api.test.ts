import { aiApi } from "../services/ai";
import { apiClient } from "../client";
import { aiAssessmentSettingsFixture } from "./fixtures/contracts";

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

  it("lists web-created quiz jobs with normalized display fields", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: [
          {
            jobId: "job-10",
            jobType: "quiz_generation",
            classId: "class-1",
            title: "Fractions checkpoint",
            status: "approved",
            progressPercent: 100,
            assessmentId: "assessment-10",
            createdAt: "2026-08-27T01:00:00.000Z",
            updatedAt: "2026-08-27T02:00:00.000Z",
          },
          { jobId: 11, status: "unexpected", progressPercent: "45" },
        ],
      },
    });

    const result = await aiApi.listTeacherJobs({ limit: 20 });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/ai/teacher/jobs", {
      params: { jobType: "quiz_generation", limit: 20 },
    });
    expect(result[0]).toMatchObject({
      jobId: "job-10",
      title: "Fractions checkpoint",
      status: "approved",
      assessmentId: "assessment-10",
    });
    expect(result[1]).toMatchObject({
      jobId: "unknown-job",
      classId: null,
      title: "AI Draft Quiz",
      status: "processing",
      progressPercent: 45,
    });
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
        questionCount: 15,
        teacherNote: "Focus on equivalent fractions",
        assessmentSettings: expect.objectContaining({
          title: "Fractions check",
          type: "quiz",
          passingScore: 60,
          feedbackLevel: "standard",
          classRecordCategory: "written_work",
        }),
        sourcePolicy: "published_default",
        allowDraftSources: false,
        lessonIds: ["lesson-1"],
        extractionIds: ["extraction-1"],
      }),
    );
  });

  it("preserves non-default nested assessment settings in the create-job body", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { data: { jobId: "quiz-job-settings", status: "queued" } },
    });
    const assessmentSettings = aiAssessmentSettingsFixture;

    await aiApi.createQuizDraftJob({
      classId: "class-1",
      questionCount: 12,
      questionType: "multiple_select",
      assessmentSettings,
      lessonIds: ["lesson-1"],
      allowDraftSources: false,
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/teacher/quizzes/jobs",
      {
        classId: "class-1",
        questionCount: 12,
        questionType: "multiple_select",
        assessmentSettings,
        sourcePolicy: "published_default",
        allowDraftSources: false,
        lessonIds: ["lesson-1"],
      },
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

  it("round-trips the complete nested settings through retrieve, update, and apply preview", async () => {
    const assessmentSettings = {
      title: "Performance task draft",
      description: "Use complete solutions.",
      type: "assignment" as const,
      dueDate: "2026-11-05T09:00:00.000Z",
      closeWhenDue: true,
      randomizeQuestions: true,
      timedQuestionsEnabled: true,
      questionTimeLimitSeconds: 90,
      strictMode: false,
      feedbackLevel: "standard" as const,
      feedbackDelayHours: 18,
      passingScore: 78,
      maxAttempts: 2,
      timeLimitMinutes: 75,
      classRecordCategory: "performance_task",
      quarter: "Q3" as const,
    };
    mockedApiClient.get.mockResolvedValue({
      data: { data: { assessmentSettings, requiresSettingsReview: false, alreadyApplied: false, schoolYear: "2026-2027", periods: [{ key: "Q3", label: "Third Quarter" }] } },
    });
    mockedApiClient.patch.mockResolvedValue({
      data: { data: { assessmentSettings, requiresSettingsReview: false } },
    });
    mockedApiClient.post.mockResolvedValue({
      data: { data: { jobId: "quiz-job-1", canApply: true, blockedReasons: [], assessmentSettings } },
    });

    const retrieved = await aiApi.getQuizDraftSettings("quiz-job-1");
    const updated = await aiApi.updateQuizDraftSettings("quiz-job-1", assessmentSettings);
    const preview = await aiApi.previewQuizDraftApply("quiz-job-1");

    expect(retrieved.assessmentSettings).toEqual(assessmentSettings);
    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/ai/teacher/quizzes/jobs/quiz-job-1/settings",
      { assessmentSettings },
    );
    expect(updated.assessmentSettings).toEqual(assessmentSettings);
    expect(preview.assessmentSettings).toEqual(assessmentSettings);
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
