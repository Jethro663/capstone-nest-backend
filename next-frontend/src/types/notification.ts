export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  message: string;
  isRead: boolean;
  referenceId?: string | null;
  metadata?: {
    classId?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
