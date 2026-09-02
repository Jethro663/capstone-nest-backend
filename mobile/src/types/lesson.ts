export type ContentBlockType = "text" | "image" | "video" | "question" | "file" | "divider";

export interface ContentBlock {
  id: string;
  lessonId: string;
  type: ContentBlockType;
  order: number;
  content?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  classId: string;
  order: number;
  isDraft: boolean;
  contentBlocks?: ContentBlock[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BulkLessonDraftStateDto {
  lessonIds: string[];
  isDraft: boolean;
}

export interface LessonCompletion {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface LessonVersion {
  id: string;
  lessonId: string;
  versionNumber: number;
  type: "auto" | "manual" | "restore";
  label?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}

export interface LessonListQuery { status?: "all" | "draft" | "published"; search?: string }
export interface BulkLessonIdsDto { lessonIds: string[] }
export interface ReorderLessonsDto { lessons: Array<{ id: string; order: number }> }
