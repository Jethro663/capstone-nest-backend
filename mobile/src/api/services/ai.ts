import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  AiGenerationStatus,
  AiClassIndexStatus,
  AiGenerationJob,
  AiGenerationJobResult,
  AiTutorAnswersResult,
  AiTutorBootstrap,
  AiTutorSession,
  AiTutorSessionStart,
  ClassAiPolicy,
  CreateQuizDraftJobInput,
  GenerateQuizDraftDto,
  InterventionRecommendationDto,
  InterventionStructuredOutput,
  ListTeacherAiJobsQuery,
  QuizDraftApplyPreview,
  QuizDraftApplyResponse,
  QuizDraftStructuredOutput,
  TutorRecommendationPayload,
  TeacherAiJobSummary,
  UpdateClassAiPolicyDto,
  UpdateQuizDraftDto,
} from "../../types/ai";

const AI_JOB_TIMEOUT_MS = 150_000;

const AI_JOB_STATUSES = [
  "queued",
  "pending",
  "running",
  "processing",
  "completed",
  "approved",
  "cancelled",
  "rejected",
  "failed",
] as const;

function normalizeAiJobStatus(value: unknown): AiGenerationStatus | string {
  if (typeof value === "string" && AI_JOB_STATUSES.includes(value as (typeof AI_JOB_STATUSES)[number])) {
    return value;
  }
  return "processing";
}

function normalizeProgressPercent(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }
  return 0;
}

function normalizeJob(job: unknown): AiGenerationJob {
  const raw = job && typeof job === "object" ? (job as Partial<AiGenerationJob>) : {};
  const jobId = raw.id || raw.jobId || "";
  const statusMessage =
    typeof raw.statusMessage === "string"
      ? raw.statusMessage
      : typeof raw.message === "string"
        ? raw.message
        : null;
  return {
    ...raw,
    id: jobId,
    jobId: raw.jobId || jobId,
    status: normalizeAiJobStatus(raw.status),
    progressPercent: normalizeProgressPercent(raw.progressPercent),
    message: statusMessage,
    statusMessage,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : null,
    outputId: typeof raw.outputId === "string" ? raw.outputId : null,
    assessmentId: typeof raw.assessmentId === "string" ? raw.assessmentId : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

function normalizeTeacherAiJobSummary(value: unknown): TeacherAiJobSummary {
  const raw = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  return {
    jobId: typeof raw.jobId === "string" ? raw.jobId : "unknown-job",
    jobType: typeof raw.jobType === "string" ? raw.jobType : "quiz_generation",
    classId: typeof raw.classId === "string" ? raw.classId : null,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : "AI Draft Quiz",
    status: normalizeAiJobStatus(raw.status) as AiGenerationStatus,
    progressPercent: normalizeProgressPercent(raw.progressPercent),
    statusMessage: typeof raw.statusMessage === "string" ? raw.statusMessage : null,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : null,
    outputId: typeof raw.outputId === "string" ? raw.outputId : null,
    assessmentId: typeof raw.assessmentId === "string" ? raw.assessmentId : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

function normalizeJobResult<TOutput>(
  payload: unknown,
  fallbackStructuredOutput: TOutput,
): AiGenerationJobResult<TOutput> {
  const rawData = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawJob = rawData.job && typeof rawData.job === "object" ? rawData.job : rawData;
  const rawResult = rawData.result && typeof rawData.result === "object" ? (rawData.result as Record<string, unknown>) : {};
  const normalizedJob = normalizeJob(rawJob);
  const outputIdFromResult = typeof rawResult.outputId === "string" ? rawResult.outputId : null;
  const outputId = outputIdFromResult ?? normalizedJob.outputId ?? "";

  return {
    ...(rawData as Partial<AiGenerationJobResult<TOutput>>),
    job: {
      ...normalizedJob,
      outputId,
    },
    result: {
      outputId,
      outputType: typeof rawResult.outputType === "string" ? rawResult.outputType : "degraded_unavailable",
      structuredOutput:
        rawResult.structuredOutput && typeof rawResult.structuredOutput === "object"
          ? (rawResult.structuredOutput as TOutput)
          : fallbackStructuredOutput,
    },
  };
}

export const aiApi = {
  async getClassIndexStatus(classId: string) {
    const response = await apiClient.get<ApiEnvelope<AiClassIndexStatus>>(`/ai/index/classes/${classId}/status`);
    return unwrapEnvelope(response.data);
  },

  async reindexClass(classId: string) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/ai/index/classes/${classId}`,
      undefined,
      { timeout: AI_JOB_TIMEOUT_MS },
    );
    return unwrapEnvelope(response.data);
  },

  async createQuizDraftJob(payload: CreateQuizDraftJobInput) {
    const clampedCount = Math.max(1, Math.min(15, payload.questionCount));
    const dto: GenerateQuizDraftDto = {
      classId: payload.classId,
      title: payload.title?.trim() || "AI Draft Assessment",
      questionCount: clampedCount,
      questionType: payload.questionType || "multiple_choice",
      assessmentType: "quiz",
      passingScore: 60,
      teacherNote: payload.teacherNote?.trim() || undefined,
      feedbackLevel: "standard",
      classRecordCategory: "written_work",
      sourcePolicy: "published_default",
      allowDraftSources: false,
      lessonIds: payload.lessonIds?.length ? payload.lessonIds : undefined,
      extractionIds: payload.extractionIds?.length ? payload.extractionIds : undefined,
    };
    const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>("/ai/teacher/quizzes/jobs", dto);
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async updateQuizDraft(jobId: string, payload: UpdateQuizDraftDto) {
    const response = await apiClient.patch<ApiEnvelope<AiGenerationJob>>(
      `/ai/teacher/quizzes/jobs/${jobId}/draft`,
      payload,
    );
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async previewQuizDraftApply(jobId: string) {
    const response = await apiClient.post<ApiEnvelope<QuizDraftApplyPreview>>(
      `/ai/teacher/quizzes/jobs/${jobId}/apply/preview`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async retryQuizDraftJob(jobId: string) {
    const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>(
      `/ai/teacher/quizzes/jobs/${jobId}/retry`,
      {},
    );
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async cancelQuizDraftJob(jobId: string) {
    const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>(
      `/ai/teacher/quizzes/jobs/${jobId}/cancel`,
      {},
    );
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async applyQuizDraftJob(jobId: string) {
    const response = await apiClient.post<ApiEnvelope<QuizDraftApplyResponse>>(
      `/ai/teacher/quizzes/jobs/${jobId}/apply`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async createInterventionJob(caseId: string, payload?: InterventionRecommendationDto) {
    const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>(
      `/ai/teacher/interventions/${caseId}/jobs`,
      payload ?? {},
    );
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async getTeacherJobStatus(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJob>>(`/ai/teacher/jobs/${jobId}`);
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async listTeacherJobs(query: ListTeacherAiJobsQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<TeacherAiJobSummary[]>>(
      "/ai/teacher/jobs",
      {
        params: {
          ...(query.classId ? { classId: query.classId } : {}),
          jobType: "quiz_generation",
          limit: query.limit ?? 20,
        },
      },
    );
    const jobs = unwrapEnvelope(response.data);
    return Array.isArray(jobs) ? jobs.map(normalizeTeacherAiJobSummary) : [];
  },

  async deleteTeacherJob(jobId: string) {
    const response = await apiClient.delete<ApiEnvelope<AiGenerationJob>>(`/ai/teacher/jobs/${jobId}`);
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async getQuizDraftJobResult(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJobResult<QuizDraftStructuredOutput>>>(
      `/ai/teacher/jobs/${jobId}/result`,
    );
    return normalizeJobResult<QuizDraftStructuredOutput>(unwrapEnvelope(response.data), {
      title: "AI draft temporarily unavailable",
      description:
        "The AI result endpoint is temporarily unavailable. Keep polling job status and retry result fetch shortly.",
      questions: [],
    });
  },

  async getInterventionJobResult(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJobResult<InterventionStructuredOutput>>>(
      `/ai/teacher/jobs/${jobId}/result`,
    );
    return normalizeJobResult<InterventionStructuredOutput>(unwrapEnvelope(response.data), {
      caseId: "",
      weakConcepts: [],
      recommendedLessons: [],
      recommendedAssessments: [],
      aiSummary: {
        summary:
          "AI intervention result is temporarily unavailable. Keep polling job status and retry shortly.",
        teacherActions: [],
        studentFocus: [],
      },
      suggestedAssignmentPayload: {
        lessonIds: [],
        assessmentIds: [],
      },
    });
  },

  async getTeacherClassPolicy(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassAiPolicy>>(`/ai/teacher/classes/${classId}/policy`);
    return unwrapEnvelope(response.data);
  },

  async updateTeacherClassPolicy(classId: string, payload: UpdateClassAiPolicyDto) {
    const response = await apiClient.patch<ApiEnvelope<ClassAiPolicy>>(
      `/ai/teacher/classes/${classId}/policy`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getTutorBootstrap(classId?: string) {
    const suffix = classId ? `?classId=${classId}` : "";
    const response = await apiClient.get<ApiEnvelope<AiTutorBootstrap>>(`/ai/student/tutor/bootstrap${suffix}`);
    return unwrapEnvelope(response.data);
  },

  async startTutorSession(payload: { classId: string; recommendation: TutorRecommendationPayload }) {
    const response = await apiClient.post<ApiEnvelope<AiTutorSessionStart>>("/ai/student/tutor/session", payload);
    return unwrapEnvelope(response.data);
  },

  async getTutorSession(sessionId: string) {
    const response = await apiClient.get<ApiEnvelope<AiTutorSession>>(`/ai/student/tutor/session/${sessionId}`);
    return unwrapEnvelope(response.data);
  },

  async sendTutorMessage(sessionId: string, message: string) {
    const response = await apiClient.post<ApiEnvelope<AiTutorSessionStart>>(
      `/ai/student/tutor/session/${sessionId}/message`,
      { sessionId, message },
    );
    return unwrapEnvelope(response.data);
  },

  async submitTutorAnswers(sessionId: string, answers: string[]) {
    const response = await apiClient.post<ApiEnvelope<AiTutorAnswersResult>>(
      `/ai/student/tutor/session/${sessionId}/answers`,
      { sessionId, answers },
    );
    return unwrapEnvelope(response.data);
  },
};
