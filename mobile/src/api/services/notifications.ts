import { apiClient } from "../client";
import { normalizeArray } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  MobileNotification,
  MobileNotificationsResponse,
} from "../../types/notification";

type NotificationsQuery = {
  page?: number;
  limit?: number;
  isRead?: boolean;
};

export type RegisterNotificationDeviceInput = {
  platform: "android" | "ios";
  provider: "expo";
  pushToken: string;
  notificationsEnabled: boolean;
  appVersion: string;
  buildNumber: number;
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
  async getAll(
    query?: NotificationsQuery,
  ): Promise<MobileNotificationsResponse> {
    const response = await apiClient.get<
      ApiEnvelope<MobileNotification[]> & MobileNotificationsResponse
    >("/notifications", { params: query });
    const payload = response.data as MobileNotificationsResponse & {
      data?: ApiNotification[];
    };
    return {
      ...payload,
      data: normalizeArray<ApiNotification>(payload.data).map((item) =>
        normalizeNotification(item),
      ),
    };
  },

  async getUnreadCount() {
    const response = await apiClient.get<ApiEnvelope<{ count: number }>>(
      "/notifications/unread-count",
    );
    const payload = response.data;
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as ApiEnvelope<{ count: number }>).data;
    }
    return { count: 0 };
  },

  async markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead() {
    const response = await apiClient.patch<
      ApiEnvelope<{ updatedCount?: number }>
    >("/notifications/read-all");
    return response.data;
  },

  async dismissOne(id: string) {
    const response = await apiClient.delete<
      ApiEnvelope<{ dismissedCount: number }>
    >(`/notifications/${id}`);
    return response.data;
  },

  async dismissAll() {
    const response =
      await apiClient.delete<ApiEnvelope<{ dismissedCount: number }>>(
        "/notifications",
      );
    return response.data;
  },

  async registerDevice(
    installationId: string,
    input: RegisterNotificationDeviceInput,
  ) {
    const response = await apiClient.put(
      `/notifications/devices/${installationId}`,
      input,
    );
    return response.data;
  },

  async revokeDevice(installationId: string) {
    const response = await apiClient.delete(
      `/notifications/devices/${installationId}`,
    );
    return response.data;
  },
};
