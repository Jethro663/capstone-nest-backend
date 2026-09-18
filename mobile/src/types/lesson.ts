export type ContentBlockType = "text" | "image" | "video" | "question" | "file" | "divider";

export type LessonTextVariant = "body" | "objectives" | "key_points" | "example" | "recap" | "reflection";
export type LessonBlockChoiceKey = "paragraph" | "objectives" | "key_points" | "example" | "image" | "video" | "checkpoint" | "recap" | "reflection" | "file" | "divider";

export interface LessonTextItem { id: string; html: string }
export interface LessonExampleStep { id: string; title: string; html: string }
export interface LessonTextContent extends Record<string, unknown> {
  heading?: string;
  html?: string;
  items?: LessonTextItem[];
  scenarioHtml?: string;
  steps?: LessonExampleStep[];
  answerHtml?: string;
  takeawayHtml?: string;
  promptHtml?: string;
}
export interface LessonQuestionChoice { id: string; html: string }
export interface LessonQuestionContent extends Record<string, unknown> {
  prompt: string;
  choices: LessonQuestionChoice[];
  answerType: "single_select" | "multi_select";
}
export interface LessonMediaContent extends Record<string, unknown> {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  caption?: string;
  displayScale?: number;
  legacyUrl?: string;
  url?: string;
}
export interface LessonDividerContent extends Record<string, unknown> { style: "line" }
export interface LessonBlockDraft {
  type: ContentBlockType;
  content: string | Record<string, unknown>;
  metadata: Record<string, unknown>;
}

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

export interface LessonVersionDetail extends LessonVersion {
  snapshot: Pick<Lesson, "title" | "description" | "order" | "isDraft" | "classId"> & { contentBlocks?: ContentBlock[] };
  inspectedLessonUpdatedAt: string;
  summary: {
    titleChanged: boolean;
    descriptionChanged: boolean;
    publicationChanged: boolean;
    currentBlockCount: number;
    snapshotBlockCount: number;
  };
}

export interface LessonPreviewSession { url: string; expiresAt: string }

export interface LessonListQuery { status?: "all" | "draft" | "published"; search?: string }
export interface BulkLessonIdsDto { lessonIds: string[] }
export interface ReorderLessonsDto { lessons: Array<{ id: string; order: number }> }
