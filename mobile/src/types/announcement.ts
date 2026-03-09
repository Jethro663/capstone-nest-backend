export interface Announcement {
  id: string;
  classId: string;
  title: string;
  content: string;
  isPinned: boolean;
  scheduledAt?: string;
  isArchived: boolean;
  fileIds?: string[];
  createdBy?: string;
  author?: { firstName?: string; lastName?: string };
  createdAt?: string;
  updatedAt?: string;
}
