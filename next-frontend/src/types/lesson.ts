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

export interface LessonCompletion {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}
