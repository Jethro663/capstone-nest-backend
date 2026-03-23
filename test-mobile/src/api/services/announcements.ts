import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { Announcement } from "../../types/announcement";

export const announcementsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Announcement[]>>(`/classes/${classId}/announcements`);
    return normalizeArray<Announcement>(unwrapEnvelope(response.data));
  },
};
