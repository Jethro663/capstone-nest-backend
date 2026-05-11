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
  QuizDraftStructuredOutput,
  TutorRecommendationPayload,
} from "../../types/ai";

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
    return unwrapEnvelope(response.data);
  },

  async getTeacherJobStatus(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJob>>(`/ai/teacher/jobs/${jobId}`);
    return unwrapEnvelope(response.data);
  },

  async deleteTeacherJob(jobId: string) {
    const response = await apiClient.delete<ApiEnvelope<AiGenerationJob>>(`/ai/teacher/jobs/${jobId}`);
    return unwrapEnvelope(response.data);
  },

  async getQuizDraftJobResult(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<AiGenerationJobResult<QuizDraftStructuredOutput>>>(
      `/ai/teacher/jobs/${jobId}/result`,
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
