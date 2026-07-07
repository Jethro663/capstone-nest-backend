import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  Announcement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../../types/announcement";

export const announcementsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Announcement[]>>(`/classes/${classId}/announcements`);
    return normalizeArray<Announcement>(unwrapEnvelope(response.data));
  },

  async create(classId: string, payload: CreateAnnouncementDto) {
    const response = await apiClient.post<ApiEnvelope<Announcement>>(
      `/classes/${classId}/announcements`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async update(classId: string, announcementId: string, payload: UpdateAnnouncementDto) {
    const response = await apiClient.patch<ApiEnvelope<Announcement>>(
      `/classes/${classId}/announcements/${announcementId}`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async delete(classId: string, announcementId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id?: string }>>(
      `/classes/${classId}/announcements/${announcementId}`,
    );
    return unwrapEnvelope(response.data);
  },
};
