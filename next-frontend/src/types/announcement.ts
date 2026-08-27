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
  class?: {
    id: string;
    subjectCode: string;
    subjectName: string;
    section: { id: string; name: string } | null;
  };
  canEdit?: boolean;
  canDelete?: boolean;
  restrictionReason?: 'core_template' | 'not_author' | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherAnnouncementFeed {
  items: Announcement[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pinnedTotal: number;
  latestCreatedAt: string | null;
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
