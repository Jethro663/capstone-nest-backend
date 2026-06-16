export interface Announcement {
  id: string;
  classId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isVisible?: boolean;
  isCoreTemplateAsset?: boolean;
  templateId?: string | null;
  templateSourceId?: string | null;
  scheduledAt?: string;
  isArchived: boolean;
  fileIds?: string[];
  createdBy?: string;
  author?: { firstName?: string; lastName?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  isPinned?: boolean;
  scheduledAt?: string;
  fileIds?: string[];
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  scheduledAt?: string;
}
