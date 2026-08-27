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
  authorId?: string;
  author?: { id?: string; firstName?: string; lastName?: string };
  canEdit?: boolean;
  canDelete?: boolean;
  restrictionReason?: "core_template" | "not_author" | null;
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
