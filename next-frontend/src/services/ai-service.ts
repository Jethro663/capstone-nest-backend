import { api } from '@/lib/api-client';
import type {
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
    return normalizeEnvelope<AiGenerationJob>(data);
  },

  async createQuizDraftJob(
    dto: GenerateQuizDraftDto,
  ): Promise<Envelope<AiGenerationJob>> {
    const { data } = await api.post('/ai/teacher/quizzes/jobs', dto);
    return normalizeEnvelope<AiGenerationJob>(data);
  },

  async getTeacherJobStatus(jobId: string): Promise<Envelope<AiGenerationJob>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}`);
    return normalizeEnvelope<AiGenerationJob>(data);
  },

  async getQuizDraftJobResult(
    jobId: string,
  ): Promise<Envelope<AiGenerationJobResult<QuizDraftStructuredOutput>>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}/result`);
    return normalizeEnvelope<AiGenerationJobResult<QuizDraftStructuredOutput>>(data);
  },

  async getInterventionJobResult(
    jobId: string,
  ): Promise<Envelope<AiGenerationJobResult<InterventionStructuredOutput>>> {
    const { data } = await api.get(`/ai/teacher/jobs/${jobId}/result`);
    return normalizeEnvelope<AiGenerationJobResult<InterventionStructuredOutput>>(data);
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
