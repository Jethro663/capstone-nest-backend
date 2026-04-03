import { api } from "@/lib/api-client";
import type {
  JaAskResponsePayload,
  JaAskThreadResponse,
  JaHubResponse,
  JaPracticeBootstrapResponse,
  JaPracticeCompleteResult,
  JaPracticeEventType,
  JaPracticeRecommendation,
  JaPracticeSessionResponse,
  JaPracticeSubmitResponseResult,
  JaReviewAttemptSummary,
} from "@/types/ja";

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

function normalizeEnvelope<T>(payload: unknown): Envelope<T> {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload as Envelope<T>;
  }
  return { data: payload as T };
}

export const jaService = {
  async getHub(classId?: string): Promise<Envelope<JaHubResponse>> {
    const { data } = await api.get("/ai/student/ja/hub", {
      params: classId ? { classId } : undefined,
    });
    return normalizeEnvelope<JaHubResponse>(data);
  },

  async getBootstrap(
    classId?: string,
  ): Promise<Envelope<JaPracticeBootstrapResponse>> {
    const { data } = await api.get("/ai/student/ja/practice/bootstrap", {
      params: classId ? { classId } : undefined,
    });
    return normalizeEnvelope<JaPracticeBootstrapResponse>(data);
  },

  async createSession(params: {
    classId: string;
    recommendation?: JaPracticeRecommendation;
  }): Promise<Envelope<JaPracticeSessionResponse>> {
    const { data } = await api.post("/ai/student/ja/practice/sessions", {
      classId: params.classId,
      recommendation: params.recommendation,
    });
    return normalizeEnvelope<JaPracticeSessionResponse>(data);
  },

  async getSession(
    sessionId: string,
  ): Promise<Envelope<JaPracticeSessionResponse>> {
    const { data } = await api.get(
      `/ai/student/ja/practice/sessions/${sessionId}`,
    );
    return normalizeEnvelope<JaPracticeSessionResponse>(data);
  },

  async submitResponse(
    sessionId: string,
    payload: { itemId: string; answer: Record<string, unknown> },
  ): Promise<Envelope<JaPracticeSubmitResponseResult>> {
    const { data } = await api.post(
      `/ai/student/ja/practice/sessions/${sessionId}/responses`,
      payload,
    );
    return normalizeEnvelope<JaPracticeSubmitResponseResult>(data);
  },

  async logEvent(
    sessionId: string,
    eventType: JaPracticeEventType,
    payload?: Record<string, unknown>,
  ) {
    const { data } = await api.post(
      `/ai/student/ja/practice/sessions/${sessionId}/events`,
      {
        eventType,
        payload,
      },
    );
    return normalizeEnvelope(data);
  },

  async completeSession(
    sessionId: string,
  ): Promise<Envelope<JaPracticeCompleteResult>> {
    const { data } = await api.post(
      `/ai/student/ja/practice/sessions/${sessionId}/complete`,
      {},
    );
    return normalizeEnvelope<JaPracticeCompleteResult>(data);
  },

  async deleteSession(sessionId: string) {
    const { data } = await api.delete(
      `/ai/student/ja/practice/sessions/${sessionId}`,
    );
    return normalizeEnvelope(data);
  },

  async getAskBootstrap(
    classId?: string,
  ): Promise<Envelope<JaPracticeBootstrapResponse & { threads: unknown[] }>> {
    const { data } = await api.get("/ai/student/ja/ask/bootstrap", {
      params: classId ? { classId } : undefined,
    });
    return normalizeEnvelope<
      JaPracticeBootstrapResponse & { threads: unknown[] }
    >(data);
  },

  async createAskThread(params: {
    classId: string;
    title?: string;
  }): Promise<Envelope<JaAskThreadResponse>> {
    const { data } = await api.post("/ai/student/ja/ask/threads", params);
    return normalizeEnvelope<JaAskThreadResponse>(data);
  },

  async getAskThread(threadId: string): Promise<Envelope<JaAskThreadResponse>> {
    const { data } = await api.get(`/ai/student/ja/ask/threads/${threadId}`);
    return normalizeEnvelope<JaAskThreadResponse>(data);
  },

  async sendAskMessage(
    threadId: string,
    payload: { message: string; quickAction?: string },
  ): Promise<Envelope<JaAskResponsePayload>> {
    const { data } = await api.post(
      `/ai/student/ja/ask/threads/${threadId}/messages`,
      payload,
    );
    return normalizeEnvelope<JaAskResponsePayload>(data);
  },

  async getReviewBootstrap(
    classId?: string,
  ): Promise<
    Envelope<
      JaPracticeBootstrapResponse & {
        eligibleAttempts: JaReviewAttemptSummary[];
        sessions: unknown[];
      }
    >
  > {
    const { data } = await api.get("/ai/student/ja/review/bootstrap", {
      params: classId ? { classId } : undefined,
    });
    return normalizeEnvelope<
      JaPracticeBootstrapResponse & {
        eligibleAttempts: JaReviewAttemptSummary[];
        sessions: unknown[];
      }
    >(data);
  },

  async createReviewSession(params: {
    classId: string;
    attemptId: string;
    questionCount?: number;
  }): Promise<Envelope<JaPracticeSessionResponse>> {
    const { data } = await api.post("/ai/student/ja/review/sessions", params);
    return normalizeEnvelope<JaPracticeSessionResponse>(data);
  },

  async getReviewSession(
    sessionId: string,
  ): Promise<Envelope<JaPracticeSessionResponse>> {
    const { data } = await api.get(`/ai/student/ja/review/sessions/${sessionId}`);
    return normalizeEnvelope<JaPracticeSessionResponse>(data);
  },

  async submitReviewResponse(
    sessionId: string,
    payload: { itemId: string; answer: Record<string, unknown> },
  ): Promise<Envelope<JaPracticeSubmitResponseResult>> {
    const { data } = await api.post(
      `/ai/student/ja/review/sessions/${sessionId}/responses`,
      payload,
    );
    return normalizeEnvelope<JaPracticeSubmitResponseResult>(data);
  },

  async logReviewEvent(
    sessionId: string,
    eventType: JaPracticeEventType,
    payload?: Record<string, unknown>,
  ) {
    const { data } = await api.post(
      `/ai/student/ja/review/sessions/${sessionId}/events`,
      {
        eventType,
        payload,
      },
    );
    return normalizeEnvelope(data);
  },

  async completeReviewSession(
    sessionId: string,
  ): Promise<Envelope<JaPracticeCompleteResult>> {
    const { data } = await api.post(
      `/ai/student/ja/review/sessions/${sessionId}/complete`,
      {},
    );
    return normalizeEnvelope<JaPracticeCompleteResult>(data);
  },
};
