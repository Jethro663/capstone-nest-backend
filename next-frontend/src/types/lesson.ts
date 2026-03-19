import type { ContentBlockType } from '@/utils/constants';

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

export type LessonStatusFilter = 'all' | 'draft' | 'published';
export type LessonCompletionFilter = 'all' | 'completed' | 'pending';
export type LessonOrderDirection = 'asc' | 'desc';

export interface LessonListQuery {
  includeBlocks?: boolean;
  page?: number;
  pageSize?: number;
  status?: LessonStatusFilter;
  completion?: LessonCompletionFilter;
  order?: LessonOrderDirection;
}

export interface LessonsResponse {
  success: boolean;
  message: string;
  data: Lesson[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContentBlock {
  id: string;
  lessonId: string;
  type: ContentBlockType;
  order: number;
  content?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateLessonDto {
  title: string;
  description?: string;
  classId: string;
  order?: number;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string;
  order?: number;
  isDraft?: boolean;
}

export interface CreateContentBlockDto {
  lessonId?: string;
  type: ContentBlockType;
  order: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContentBlockDto {
  type?: ContentBlockType;
  order?: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface ReorderBlocksDto {
  blocks: { id: string; order: number }[];
}

export interface ReorderLessonsDto {
  lessons: { id: string; order: number }[];
}

export interface BulkLessonDraftStateDto {
  lessonIds: string[];
  isDraft: boolean;
}

export interface BulkLessonIdsDto {
  lessonIds: string[];
}

export interface LessonCompletion {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}
