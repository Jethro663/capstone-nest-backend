import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  JaAskSendResponse,
  JaAskThreadResponse,
  JaHubResponse,
  JaPracticeCompleteResult,
  JaPracticeEventType,
  JaPracticeSessionResponse,
  JaPracticeSubmitResponseResult,
  JaRecommendation,
} from "../../types/ja";

export const jaApi = {
  async getHub(classId?: string) {
    const suffix = classId ? `?classId=${classId}` : "";
    const response = await apiClient.get<ApiEnvelope<JaHubResponse>>(`/ai/student/ja/hub${suffix}`);
    return unwrapEnvelope(response.data);
  },

  async createSession(payload: { classId: string; recommendation?: JaRecommendation }) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeSessionResponse>>(
      "/ai/student/ja/practice/sessions",
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getSession(sessionId: string) {
    const response = await apiClient.get<ApiEnvelope<JaPracticeSessionResponse>>(
      `/ai/student/ja/practice/sessions/${sessionId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async submitResponse(sessionId: string, payload: { itemId: string; answer: Record<string, unknown> }) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeSubmitResponseResult>>(
      `/ai/student/ja/practice/sessions/${sessionId}/responses`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async logEvent(sessionId: string, eventType: JaPracticeEventType, payload?: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/ai/student/ja/practice/sessions/${sessionId}/events`,
      { eventType, payload },
    );
    return unwrapEnvelope(response.data);
  },

  async completeSession(sessionId: string) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeCompleteResult>>(
      `/ai/student/ja/practice/sessions/${sessionId}/complete`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async deleteSession(sessionId: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(
      `/ai/student/ja/practice/sessions/${sessionId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async createAskThread(payload: { classId: string; title?: string; lessonId?: string }) {
    const response = await apiClient.post<ApiEnvelope<JaAskThreadResponse>>("/ai/student/ja/ask/threads", payload);
    return unwrapEnvelope(response.data);
  },

  async getAskThread(threadId: string) {
    const response = await apiClient.get<ApiEnvelope<JaAskThreadResponse>>(`/ai/student/ja/ask/threads/${threadId}`);
    return unwrapEnvelope(response.data);
  },

  async sendAskMessage(
    threadId: string,
    payload: string | { message: string; quickAction?: string; lessonId?: string },
  ) {
    const response = await apiClient.post<ApiEnvelope<JaAskSendResponse>>(
      `/ai/student/ja/ask/threads/${threadId}/messages`,
      typeof payload === "string" ? { message: payload } : payload,
    );
    return unwrapEnvelope(response.data);
  },

  async createReviewSession(payload: { classId: string; attemptId: string; questionCount?: number }) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeSessionResponse>>(
      "/ai/student/ja/review/sessions",
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getReviewSession(sessionId: string) {
    const response = await apiClient.get<ApiEnvelope<JaPracticeSessionResponse>>(
      `/ai/student/ja/review/sessions/${sessionId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async submitReviewResponse(sessionId: string, payload: { itemId: string; answer: Record<string, unknown> }) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeSubmitResponseResult>>(
      `/ai/student/ja/review/sessions/${sessionId}/responses`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async logReviewEvent(sessionId: string, eventType: JaPracticeEventType, payload?: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/ai/student/ja/review/sessions/${sessionId}/events`,
      { eventType, payload },
    );
    return unwrapEnvelope(response.data);
  },

  async completeReviewSession(sessionId: string) {
    const response = await apiClient.post<ApiEnvelope<JaPracticeCompleteResult>>(
      `/ai/student/ja/review/sessions/${sessionId}/complete`,
      {},
    );
    return unwrapEnvelope(response.data);
  },
};
