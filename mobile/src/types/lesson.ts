export type ContentBlockType = 'text' | 'image' | 'video' | 'question' | 'file' | 'divider';

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

export interface LessonCompletion {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}
