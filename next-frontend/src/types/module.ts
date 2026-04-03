export type ModuleItemType = 'lesson' | 'assessment' | 'file';

export interface ModuleLessonRef {
  id: string;
  classId: string;
  title: string;
  description?: string;
  order: number;
  isDraft: boolean;
}

export interface ModuleAssessmentRef {
  id: string;
  classId: string;
  title: string;
  description?: string;
  type: string;
  totalPoints: number;
  isPublished?: boolean;
  dueDate?: string | null;
}

export interface ModuleFileRef {
  id: string;
  classId?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scope: 'private' | 'general';
}

export interface ModuleItem {
  id: string;
  moduleSectionId: string;
  itemType: ModuleItemType;
  lessonId?: string | null;
  assessmentId?: string | null;
  fileId?: string | null;
  order: number;
  isVisible: boolean;
  isRequired: boolean;
  isGiven: boolean;
  metadata?: Record<string, unknown> | null;
  accessible?: boolean;
  completed?: boolean;
  lessonPoints?: number;
  lesson?: ModuleLessonRef | null;
  assessment?: ModuleAssessmentRef | null;
  file?: ModuleFileRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModuleSection {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  items: ModuleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ModuleGradingScaleEntry {
  id: string;
  moduleId: string;
  letter: string;
  label: string;
  minScore: number;
  maxScore: number;
  description?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassModule {
  id: string;
  classId: string;
  title: string;
  description?: string;
  order: number;
  isVisible: boolean;
  isLocked: boolean;
  teacherNotes?: string;
  themeKind?: 'gradient' | 'image';
  gradientId?: string;
  coverImageUrl?: string | null;
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
  completed?: boolean;
  requiredVisibleCount?: number;
  requiredCompletedCount?: number;
  progressPercent?: number;
  sections: ModuleSection[];
  gradingScaleEntries: ModuleGradingScaleEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassModuleDto {
  classId: string;
  title: string;
  description?: string;
  order?: number;
}

export interface UpdateClassModuleDto {
  title?: string;
  description?: string;
  isVisible?: boolean;
  isLocked?: boolean;
  teacherNotes?: string;
  themeKind?: 'gradient' | 'image';
  gradientId?: string;
  coverImageUrl?: string | null;
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
}

export interface CreateModuleSectionDto {
  title: string;
  description?: string;
  order?: number;
}

export interface UpdateModuleSectionDto {
  title?: string;
  description?: string;
}

export interface AttachModuleItemDto {
  itemType: ModuleItemType;
  lessonId?: string;
  assessmentId?: string;
  fileId?: string;
  order?: number;
  isVisible?: boolean;
  isRequired?: boolean;
  isGiven?: boolean;
  metadata?: Record<string, unknown>;
  points?: number;
}

export interface UpdateModuleItemDto {
  order?: number;
  isVisible?: boolean;
  isRequired?: boolean;
  isGiven?: boolean;
  metadata?: Record<string, unknown>;
  points?: number;
}

export interface ReplaceModuleGradingScaleDto {
  entries: Array<{
    letter: string;
    label: string;
    minScore: number;
    maxScore: number;
    description?: string;
    order?: number;
  }>;
}
