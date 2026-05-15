import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  AiClassIndexStatus,
  AiGenerationJob,
  AiGenerationJobResult,
  AiTutorAnswersResult,
  AiTutorBootstrap,
  AiTutorSession,
  AiTutorSessionStart,
  ClassAiPolicy,
  InterventionRecommendationDto,
  InterventionStructuredOutput,
  QuizDraftStructuredOutput,
  TutorRecommendationPayload,
  UpdateClassAiPolicyDto,
} from "../../types/ai";

function normalizeJob(job: AiGenerationJob): AiGenerationJob {
  const jobId = job.id || job.jobId || "";
  return {
    ...job,
    id: jobId,
    jobId: job.jobId || jobId,
  };
}

function normalizeJobResult<TOutput>(payload: AiGenerationJobResult<TOutput>): AiGenerationJobResult<TOutput> {
  return {
    ...payload,
    job: normalizeJob(payload.job),
  };
}

export const aiApi = {
  async getClassIndexStatus(classId: string) {
    const response = await apiClient.get<ApiEnvelope<AiClassIndexStatus>>(`/ai/index/classes/${classId}/status`);
    return unwrapEnvelope(response.data);
  },

  async reindexClass(classId: string) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(`/ai/index/classes/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async createQuizDraftJob(payload: {
    classId: string;
    title: string;
    questionCount?: number;
    difficulty?: string;
    teacherNote?: string;
    lessonIds?: string[];
    extractionIds?: string[];
    useAllReadySources?: boolean;
  }) {
    const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>("/ai/teacher/quizzes/jobs", payload);
    return normalizeJob(unwrapEnvelope(response.data));
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

  async deleteTeacherJob(jobId: string) {
    const response = await apiClient.delete<ApiEnvelope<AiGenerationJob>>(`/ai/teacher/jobs/${jobId}`);
    return normalizeJob(unwrapEnvelope(response.data));
  },

  async getQuizDraftJobResult(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJobResult<QuizDraftStructuredOutput>>>(
      `/ai/teacher/jobs/${jobId}/result`,
    );
    return normalizeJobResult(unwrapEnvelope(response.data));
  },

  async getInterventionJobResult(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJobResult<InterventionStructuredOutput>>>(
      `/ai/teacher/jobs/${jobId}/result`,
    );
    return normalizeJobResult(unwrapEnvelope(response.data));
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
