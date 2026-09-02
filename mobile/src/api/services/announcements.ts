import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import { fetchAllPages, normalizePageEnvelope } from "../pagination";
import type { ApiEnvelope } from "../../types/api";
import type {
  Announcement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../../types/announcement";

export const announcementsApi = {
  async getPageByClass(classId: string, query: { page?: number; limit?: number } = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const response = await apiClient.get<ApiEnvelope<Announcement[]>>(`/classes/${classId}/announcements`, {
      params: { page, limit },
    });
    return normalizePageEnvelope(response.data, page, limit);
  },

  async getAllByClass(classId: string) {
    return fetchAllPages(
      (page, limit) => announcementsApi.getPageByClass(classId, { page, limit }),
      { key: (announcement) => announcement.id },
    );
  },

  async getByClass(classId: string) {
    return (await announcementsApi.getAllByClass(classId)).data;
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
