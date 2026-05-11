import { apiClient } from "../client";
import { normalizeArray } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { MobileNotification, MobileNotificationsResponse } from "../../types/notification";

type NotificationsQuery = {
  page?: number;
  limit?: number;
  isRead?: boolean;
};

type ApiNotification = Omit<MobileNotification, "message"> & {
  message?: string;
};

function normalizeNotification(raw: ApiNotification): MobileNotification {
  return {
    ...raw,
    message: raw.message ?? raw.body ?? "",
  };
}

export const notificationsApi = {
  async getAll(query?: NotificationsQuery): Promise<MobileNotificationsResponse> {
    const response = await apiClient.get<ApiEnvelope<MobileNotification[]> & MobileNotificationsResponse>(
      "/notifications",
      { params: query },
    );
    const payload = response.data as MobileNotificationsResponse & { data?: ApiNotification[] };
    return {
      ...payload,
      data: normalizeArray<ApiNotification>(payload.data).map((item) => normalizeNotification(item)),
    };
  },

  async getUnreadCount() {
    const response = await apiClient.get<ApiEnvelope<{ count: number }>>("/notifications/unread-count");
    const payload = response.data;
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as ApiEnvelope<{ count: number }>).data;
    }
    return { count: 0 };
  },

  async markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`);
  },
};
