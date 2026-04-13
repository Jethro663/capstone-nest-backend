import { api } from '@/lib/api-client';
import type { Notification, NotificationsResponse } from '@/types/notification';

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

type ApiNotification = Omit<Notification, 'message'> & {
  body?: string;
  message?: string;
};

export function normalizeNotification(raw: ApiNotification): Notification {
  const referenceId = raw.referenceId ?? raw.metadata?.referenceId;

  return {
    ...raw,
    message: raw.message ?? raw.body ?? '',
    metadata: referenceId
      ? { ...(raw.metadata ?? {}), referenceId }
      : raw.metadata,
  };
}

export const notificationService = {
  /** GET /notifications — All roles */
  async getAll(query?: NotificationsQuery): Promise<NotificationsResponse> {
    const { data } = await api.get('/notifications', { params: query });
    return {
      ...data,
      data: Array.isArray(data.data)
        ? data.data.map((item: ApiNotification) => normalizeNotification(item))
        : [],
    };
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
