export interface ModuleItem {
  id: string;
  moduleSectionId?: string;
  itemType: "lesson" | "assessment" | "file" | string;
  lessonId?: string | null;
  assessmentId?: string | null;
  fileId?: string | null;
  order: number;
  isVisible?: boolean;
  isRequired?: boolean;
  isGiven?: boolean;
  isCoreTemplateAsset?: boolean;
  templateId?: string | null;
  templateSourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  accessible?: boolean;
  completed?: boolean;
  lessonPoints?: number;
  lesson?: {
    id?: string;
    classId?: string;
    title?: string;
    description?: string;
    order?: number;
    isDraft?: boolean | null;
  } | null;
  assessment?: {
    id?: string;
    classId?: string;
    title?: string;
    description?: string;
    type?: string;
    totalPoints?: number;
    isPublished?: boolean;
    dueDate?: string | null;
  } | null;
  file?: {
    id?: string;
    classId?: string | null;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    scope?: "private" | "general";
  } | null;
}

export interface ModuleSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  items: ModuleItem[];
}

export interface ClassModule {
  id: string;
  classId: string;
  title: string;
  description?: string | null;
  order: number;
  isVisible?: boolean;
  isLocked?: boolean;
  teacherNotes?: string | null;
  coverImageUrl?: string | null;
  themeKind?: "gradient" | "image";
  gradientId?: string | null;
  progressPercent?: number;
  sections: ModuleSection[];
}

export interface UpdateClassModuleDto {
  title?: string;
  description?: string;
  isVisible?: boolean;
  isLocked?: boolean;
  teacherNotes?: string | null;
  themeKind?: "gradient" | "image";
  gradientId?: string | null;
  coverImageUrl?: string | null;
}

export interface UpdateModuleItemDto {
  order?: number;
  isVisible?: boolean;
  isRequired?: boolean;
  isGiven?: boolean;
  metadata?: Record<string, unknown>;
  points?: number;
}
