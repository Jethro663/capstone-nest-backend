export interface MobileNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  isRead: boolean;
  referenceId?: string | null;
  createdAt: string;
}

export interface MobileNotificationsResponse {
  success: boolean;
  message: string;
  data: MobileNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
