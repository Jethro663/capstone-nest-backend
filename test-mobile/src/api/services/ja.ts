import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { JaAskSendResponse, JaAskThreadResponse, JaHubResponse } from "../../types/ja";

export const jaApi = {
  async getHub(classId?: string) {
    const suffix = classId ? `?classId=${classId}` : "";
    const response = await apiClient.get<ApiEnvelope<JaHubResponse>>(`/ai/student/ja/hub${suffix}`);
    return unwrapEnvelope(response.data);
  },

  async createAskThread(payload: { classId: string; title?: string }) {
    const response = await apiClient.post<ApiEnvelope<JaAskThreadResponse>>("/ai/student/ja/ask/threads", payload);
    return unwrapEnvelope(response.data);
  },

  async getAskThread(threadId: string) {
    const response = await apiClient.get<ApiEnvelope<JaAskThreadResponse>>(`/ai/student/ja/ask/threads/${threadId}`);
    return unwrapEnvelope(response.data);
  },

  async sendAskMessage(threadId: string, message: string) {
    const response = await apiClient.post<ApiEnvelope<JaAskSendResponse>>(
      `/ai/student/ja/ask/threads/${threadId}/messages`,
      { message },
    );
    return unwrapEnvelope(response.data);
  },
};
