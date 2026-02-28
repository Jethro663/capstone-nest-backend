import { api } from '@/lib/api-client';
import type { Notification } from '@/types/notification';

export interface NotificationsQuery {
  page?: number;
  limit?: number;
}

export const notificationService = {
  /** GET /notifications — All roles */
  async getAll(query?: NotificationsQuery): Promise<{ success: boolean; message: string; data: Notification[] }> {
    const { data } = await api.get('/notifications', { params: query });
    return data;
  },

  /** GET /notifications/unread-count — All roles */
  async getUnreadCount(): Promise<{ success: boolean; message: string; data: { count: number } }> {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  /** PATCH /notifications/read-all — All roles */
  async readAll(): Promise<{ success: boolean; message: string }> {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },

  /** PATCH /notifications/:id/read — All roles */
  async markRead(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
};
