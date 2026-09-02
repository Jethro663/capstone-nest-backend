import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  JaActivityHistoryResponse,
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

  async getActivityHistoryPage(params: {
    classId: string;
    mode?: "all" | "ask" | "review";
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get<ApiEnvelope<JaActivityHistoryResponse>>("/ai/student/ja/history", {
      params: { ...params, page: params.page ?? 1, limit: params.limit ?? 20 },
    });
    return unwrapEnvelope(response.data);
  },

  async getAllActivityHistory(params: { classId: string; mode?: "all" | "ask" | "review" }) {
    const items: JaActivityHistoryResponse["items"] = [];
    const seen = new Set<string>();
    let page = 1;
    let latest: JaActivityHistoryResponse | null = null;

    do {
      latest = await jaApi.getActivityHistoryPage({ ...params, page, limit: 20 });
      for (const item of latest.items) {
        const key = `${item.mode}:${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
      page += 1;
    } while (latest.pagination.hasNext && page <= 100);

    const fallback = latest ?? {
      items: [],
      counts: { all: 0, ask: 0, review: 0 },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false },
    };
    return {
      ...fallback,
      items: items.sort((left, right) => right.activityAt.localeCompare(left.activityAt) || left.id.localeCompare(right.id)),
      pagination: { ...fallback.pagination, page: 1, hasNext: false },
    };
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

  async getAskThreadPage(threadId: string, params?: { limit?: number; before?: string }) {
    const response = await apiClient.get<ApiEnvelope<JaAskThreadResponse>>(`/ai/student/ja/ask/threads/${threadId}`, {
      params: { limit: params?.limit ?? 40, before: params?.before },
    });
    return unwrapEnvelope(response.data);
  },

  async getAskThread(threadId: string) {
    const pages: JaAskThreadResponse[] = [];
    const seenCursors = new Set<string>();
    let before: string | undefined;

    do {
      const page = await jaApi.getAskThreadPage(threadId, { limit: 40, before });
      pages.push(page);
      const next = page.pageInfo?.hasMore ? page.pageInfo.nextCursor ?? undefined : undefined;
      if (!next || seenCursors.has(next)) break;
      seenCursors.add(next);
      before = next;
    } while (pages.length < 100);

    const newest = pages[0];
    const messages = pages
      .flatMap((page) => page.messages)
      .filter((message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index)
      .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? "") || left.id.localeCompare(right.id));
    return { ...newest, messages, pageInfo: { hasMore: false, nextCursor: null } };
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
