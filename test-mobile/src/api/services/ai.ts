import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  AiTutorAnswersResult,
  AiTutorBootstrap,
  AiTutorSession,
  AiTutorSessionStart,
  TutorRecommendationPayload,
} from "../../types/ai";

export const aiApi = {
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
