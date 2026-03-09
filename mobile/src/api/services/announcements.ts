import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { Announcement } from '@/types/announcement';

export const announcementsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Announcement[]>>(`/classes/${classId}/announcements`);
    return unwrapEnvelope(response.data);
  },
};
