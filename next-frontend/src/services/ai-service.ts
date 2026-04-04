import { api } from '@/lib/api-client';
import type {
  AiGenerationStatus,
  AiGenerationJob,
  AiGenerationJobResult,
  GenerateQuizDraftDto,
  GenerateQuizDraftResponse,
  InterventionStructuredOutput,
  InterventionRecommendation,
  InterventionRecommendationDto,
  MentorExplainDto,
  MentorExplainResponse,
  IndexingSummary,
  QuizDraftStructuredOutput,
  StudentTutorAnswerResponse,
  StudentTutorBootstrapResponse,
  StudentTutorMessageResponse,
  StudentTutorRecommendation,
  StudentTutorSessionResponse,
  StudentTutorSessionStartResponse,
} from '@/types/ai';

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

const AI_CHAT_TIMEOUT_MS = 90_000;
const AI_JOB_TIMEOUT_MS = 150_000;
const TUTOR_FOCUS_TEXT_MAX = 900;

function clampTutorRecommendation(
  recommendation: StudentTutorRecommendation,
): StudentTutorRecommendation {
  const focusText = recommendation.focusText || '';
  if (focusText.length <= TUTOR_FOCUS_TEXT_MAX) {
    return recommendation;
  }
  return {
    ...recommendation,
    focusText: `${focusText.slice(0, TUTOR_FOCUS_TEXT_MAX - 3).trimEnd()}...`,
  };
}

function normalizeEnvelope<T>(payload: unknown): Envelope<T> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as Envelope<T>;
  }
  return { data: payload as T };
}

const AI_JOB_RESULT_STATUSES: AiGenerationStatus[] = [
  'pending',
  'processing',
  'completed',
  'approved',
  'rejected',
  'failed',
];

const AI_JOB_STATUSES: AiGenerationStatus[] = [...AI_JOB_RESULT_STATUSES];

function normalizeAiJobStatus(value: unknown): AiGenerationStatus {
  if (typeof value === 'string' && AI_JOB_STATUSES.includes(value as AiGenerationStatus)) {
    return value as AiGenerationStatus;
  }
  return 'processing';
}

function normalizeProgressPercent(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }
  return 0;
}

function normalizeJobEnvelope(payload: unknown): Envelope<AiGenerationJob> {
  const envelope = normalizeEnvelope<unknown>(payload);
  const rawData = envelope.data;
  const rawRecord =
    rawData && typeof rawData === 'object'
      ? (rawData as Record<string, unknown>)
      : {};
  const status = normalizeAiJobStatus(rawRecord.status);

  return {
    ...envelope,
    data: {
      jobId:
        typeof rawRecord.jobId === 'string' ? rawRecord.jobId : 'unknown-job',
      jobType:
        typeof rawRecord.jobType === 'string' ? rawRecord.jobType : 'unknown',
      status,
      progressPercent: normalizeProgressPercent(rawRecord.progressPercent),
      statusMessage:
        typeof rawRecord.statusMessage === 'string'
          ? rawRecord.statusMessage
          : null,
      errorMessage:
        typeof rawRecord.errorMessage === 'string'
          ? rawRecord.errorMessage
          : null,
      outputId: typeof rawRecord.outputId === 'string' ? rawRecord.outputId : null,
      assessmentId:
        typeof rawRecord.assessmentId === 'string'
          ? rawRecord.assessmentId
          : null,
      updatedAt:
        typeof rawRecord.updatedAt === 'string' ? rawRecord.updatedAt : null,
    },
  };
}

function normalizeJobResultEnvelope<T>(
  payload: unknown,
  fallbackStructuredOutput: T,
): Envelope<AiGenerationJobResult<T>> {
  const envelope = normalizeEnvelope<unknown>(payload);
  const rawData = envelope.data;

  if (
    rawData &&
    typeof rawData === 'object' &&
    'job' in rawData &&
    'result' in rawData
  ) {
    const rawRecord = rawData as Record<string, unknown>;
    const rawJob =
      rawRecord.job && typeof rawRecord.job === 'object'
        ? (rawRecord.job as Record<string, unknown>)
        : {};
    const rawResult =
      rawRecord.result && typeof rawRecord.result === 'object'
        ? (rawRecord.result as Record<string, unknown>)
        : {};

    const outputIdFromResult =
      typeof rawResult.outputId === 'string' ? rawResult.outputId : null;
    const outputIdFromJob =
      typeof rawJob.outputId === 'string' ? rawJob.outputId : null;
    const normalizedOutputId = outputIdFromResult ?? outputIdFromJob ?? '';
    const normalizedStatus = normalizeAiJobStatus(rawJob.status);

    return {
      ...envelope,
      data: {
        job: {
          jobId:
            typeof rawJob.jobId === 'string' ? rawJob.jobId : 'unknown-job',
          jobType:
            typeof rawJob.jobType === 'string' ? rawJob.jobType : 'unknown',
          status: normalizedStatus,
          outputId: normalizedOutputId,
          assessmentId:
            typeof rawJob.assessmentId === 'string' ? rawJob.assessmentId : null,
          updatedAt:
            typeof rawJob.updatedAt === 'string' ? rawJob.updatedAt : null,
        },
        result: {
          outputId: normalizedOutputId,
          outputType:
            typeof rawResult.outputType === 'string'
              ? rawResult.outputType
              : 'degraded_unavailable',
          structuredOutput:
            typeof rawResult.structuredOutput === 'object' &&
            rawResult.structuredOutput !== null
              ? (rawResult.structuredOutput as T)
              : fallbackStructuredOutput,
        },
      },
    };
  }

  const fallbackRecord =
    rawData && typeof rawData === 'object'
      ? (rawData as Record<string, unknown>)
      : {};
  const status = normalizeAiJobStatus(fallbackRecord.status);
  const outputId =
    typeof fallbackRecord.outputId === 'string' ? fallbackRecord.outputId : '';

  return {
    ...envelope,
    data: {
      job: {
        jobId:
          typeof fallbackRecord.jobId === 'string'
            ? fallbackRecord.jobId
            : 'unknown-job',
        jobType:
          typeof fallbackRecord.jobType === 'string'
            ? fallbackRecord.jobType
            : 'unknown',
        status,
        outputId,
        assessmentId:
          typeof fallbackRecord.assessmentId === 'string'
            ? fallbackRecord.assessmentId
            : null,
        updatedAt:
          typeof fallbackRecord.updatedAt === 'string'
            ? fallbackRecord.updatedAt
            : null,
      },
      result: {
        outputId,
        outputType: 'degraded_unavailable',
        structuredOutput: fallbackStructuredOutput,
      },
    },
  };
}

export const aiService = {
  async explainMistake(dto: MentorExplainDto): Promise<Envelope<MentorExplainResponse>> {
    const { data } = await api.post('/ai/mentor/explain', dto, { timeout: AI_CHAT_TIMEOUT_MS });
    return normalizeEnvelope<MentorExplainResponse>(data);
  },

  async recommendIntervention(
    caseId: string,
    dto?: InterventionRecommendationDto,
  ): Promise<Envelope<InterventionRecommendation>> {
    const { data } = await api.post(`/ai/teacher/interventions/${caseId}/recommend`, dto ?? {}, {
      timeout: AI_CHAT_TIMEOUT_MS,
    });
    return normalizeEnvelope<InterventionRecommendation>(data);
  },

  async generateQuizDraft(
    dto: GenerateQuizDraftDto,
  ): Promise<Envelope<GenerateQuizDraftResponse>> {
    const { data } = await api.post('/ai/teacher/quizzes/generate-draft', dto, {
      timeout: AI_JOB_TIMEOUT_MS,
    });
    return normalizeEnvelope<GenerateQuizDraftResponse>(data);
  },

  async createInterventionJob(
    caseId: string,
    dto?: InterventionRecommendationDto,
  ): Promise<Envelope<AiGenerationJob>> {
    const { data } = await api.post(`/ai/teacher/interventions/${caseId}/jobs`, dto ?? {});
    return normalizeJobEnvelope(data);
  },

  async createQuizDraftJob(
    dto: GenerateQuizDraftDto,
  ): Promise<Envelope<AiGenerationJob>> {
    const { data } = await api.post('/ai/teacher/quizzes/jobs', dto);
    return normalizeJobEnvelope(data);
  },

  async getTeacherJobStatus(jobId: string): Promise<Envelope<AiGenerationJob>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}`);
    return normalizeJobEnvelope(data);
  },

  async getQuizDraftJobResult(
    jobId: string,
  ): Promise<Envelope<AiGenerationJobResult<QuizDraftStructuredOutput>>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}/result`);
    return normalizeJobResultEnvelope<QuizDraftStructuredOutput>(data, {
      title: 'AI draft temporarily unavailable',
      description:
        'The AI result endpoint is temporarily unavailable. Keep polling job status and retry result fetch shortly.',
      questions: [],
    });
  },

  async getInterventionJobResult(
    jobId: string,
  ): Promise<Envelope<AiGenerationJobResult<InterventionStructuredOutput>>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}/result`);
    return normalizeJobResultEnvelope<InterventionStructuredOutput>(data, {
      caseId: '',
      weakConcepts: [],
      recommendedLessons: [],
      recommendedAssessments: [],
      aiSummary: {
        summary:
          'AI intervention result is temporarily unavailable. Keep polling job status and retry shortly.',
        teacherActions: [],
        studentFocus: [],
      },
      suggestedAssignmentPayload: {
        lessonIds: [],
        assessmentIds: [],
      },
    });
  },

  async reindexClass(classId: string): Promise<Envelope<IndexingSummary>> {
    const { data } = await api.post(`/ai/index/classes/${classId}`, undefined, {
      timeout: AI_JOB_TIMEOUT_MS,
    });
    return normalizeEnvelope<IndexingSummary>(data);
  },

  async getStudentTutorBootstrap(classId?: string): Promise<Envelope<StudentTutorBootstrapResponse>> {
    const { data } = await api.get('/ai/student/tutor/bootstrap', {
      timeout: AI_CHAT_TIMEOUT_MS,
      params: classId ? { classId } : undefined,
    });
    return normalizeEnvelope<StudentTutorBootstrapResponse>(data);
  },

  async startStudentTutorSession(
    classId: string,
    recommendation: StudentTutorRecommendation,
  ): Promise<Envelope<StudentTutorSessionStartResponse>> {
    const { data } = await api.post('/ai/student/tutor/session', {
      classId,
      recommendation: clampTutorRecommendation(recommendation),
    }, {
      timeout: AI_CHAT_TIMEOUT_MS,
    });
    return normalizeEnvelope<StudentTutorSessionStartResponse>(data);
  },

  async getStudentTutorSession(sessionId: string): Promise<Envelope<StudentTutorSessionResponse>> {
    const { data } = await api.get(`/ai/student/tutor/session/${sessionId}`);
    return normalizeEnvelope<StudentTutorSessionResponse>(data);
  },

  async sendStudentTutorMessage(
    sessionId: string,
    message: string,
  ): Promise<Envelope<StudentTutorMessageResponse>> {
    const { data } = await api.post(
      `/ai/student/tutor/session/${sessionId}/message`,
      {
        sessionId,
        message,
      },
      {
        timeout: AI_CHAT_TIMEOUT_MS,
      },
    );
    return normalizeEnvelope<StudentTutorMessageResponse>(data);
  },

  async submitStudentTutorAnswers(
    sessionId: string,
    answers: string[],
  ): Promise<Envelope<StudentTutorAnswerResponse>> {
    const { data } = await api.post(
      `/ai/student/tutor/session/${sessionId}/answers`,
      {
        sessionId,
        answers,
      },
      {
        timeout: AI_CHAT_TIMEOUT_MS,
      },
    );
    return normalizeEnvelope<StudentTutorAnswerResponse>(data);
  },
};
