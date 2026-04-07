import { api } from '@/lib/api-client';
import type { Announcement, CreateAnnouncementDto, UpdateAnnouncementDto } from '@/types/announcement';

export interface AnnouncementsQuery {
  page?: number;
  limit?: number;
}

export const announcementService = {
  /** POST /classes/:classId/announcements — Teacher */
  async create(classId: string, dto: CreateAnnouncementDto): Promise<{ success: boolean; message: string; data: Announcement }> {
    const { data } = await api.post(`/classes/${classId}/announcements`, dto);
    return data;
  },

  /** GET /classes/:classId/announcements — Teacher, Student */
  async getByClass(classId: string, query?: AnnouncementsQuery): Promise<{ success: boolean; message: string; data: Announcement[] }> {
    const { data } = await api.get(`/classes/${classId}/announcements`, { params: query });
    return data;
  },

  /** GET /classes/:classId/announcements/:id — Teacher, Student */
  async getById(classId: string, id: string): Promise<{ success: boolean; message: string; data: Announcement }> {
    const { data } = await api.get(`/classes/${classId}/announcements/${id}`);
    return data;
  },

  /** PATCH /classes/:classId/announcements/:id — Teacher */
  async update(classId: string, id: string, dto: UpdateAnnouncementDto): Promise<{ success: boolean; message: string; data: Announcement }> {
    const { data } = await api.patch(`/classes/${classId}/announcements/${id}`, dto);
    return data;
  },

  async releaseCore(
    classId: string,
    id: string,
    dto: { isVisible?: boolean; isPublished?: boolean },
  ): Promise<{ success: boolean; message: string; data: Announcement }> {
    const { data } = await api.patch(
      `/classes/${classId}/announcements/${id}/core-release`,
      dto,
    );
    return data;
  },

  /** DELETE /classes/:classId/announcements/:id — Teacher */
  async delete(classId: string, id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/classes/${classId}/announcements/${id}`);
    return data;
  },
};
