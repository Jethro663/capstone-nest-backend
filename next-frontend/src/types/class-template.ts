export type ClassTemplateStatus = 'draft' | 'published';
export type ClassTemplateItemType = 'assessment' | 'lesson' | 'file';

export interface ClassTemplate {
  id: string;
  name: string;
  subjectCode: string;
  subjectGradeLevel: string;
  status: ClassTemplateStatus;
  createdBy: string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassTemplateAssessmentSettings {
  dueDateOffsetDays?: number;
  maxAttempts?: number;
  passingScore?: number;
  randomizeQuestions?: boolean;
  closeWhenDue?: boolean;
}

export interface ClassTemplateQuestionOption {
  id?: string;
  text: string;
  isCorrect?: boolean;
  order?: number;
}

export interface ClassTemplateQuestion {
  id?: string;
  type: string;
  content: string;
  points?: number;
  order?: number;
  isRequired?: boolean;
  explanation?: string;
  imageUrl?: string;
  options?: ClassTemplateQuestionOption[];
}

export interface ClassTemplateAssessment {
  id?: string;
  title: string;
  description?: string;
  type?: string;
  settings?: ClassTemplateAssessmentSettings;
  questions?: ClassTemplateQuestion[];
  totalPoints?: number;
  order?: number;
}

export interface ClassTemplateModuleItem {
  id?: string;
  itemType: ClassTemplateItemType;
  templateAssessmentId?: string;
  templateLessonId?: string;
  order?: number;
  isRequired?: boolean;
  metadata?: Record<string, unknown>;
  points?: number;
}

export interface ClassTemplateModuleSection {
  id?: string;
  title: string;
  description?: string;
  order?: number;
  items?: ClassTemplateModuleItem[];
}

export interface ClassTemplateModule {
  id?: string;
  title: string;
  description?: string;
  teacherNotes?: string;
  order?: number;
  isVisible?: boolean;
  isLocked?: boolean;
  themeKind?: string;
  gradientId?: string;
  coverImageUrl?: string | null;
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
  sections?: ClassTemplateModuleSection[];
}

export interface ClassTemplateAnnouncement {
  id?: string;
  title: string;
  content: string;
  isPinned?: boolean;
  order?: number;
}

export interface ClassTemplateContent {
  modules: ClassTemplateModule[];
  assessments: ClassTemplateAssessment[];
  announcements: ClassTemplateAnnouncement[];
  lessons?: ClassTemplateLesson[];
  chunks?: ClassTemplateEngineChunk[];
}

export interface CreateClassTemplateDto {
  name: string;
  subjectCode: string;
  subjectGradeLevel: string;
}

export interface ClassTemplateLessonBlock {
  id?: string;
  blockType: string;
  blockVersion?: number;
  order?: number;
  payload: Record<string, unknown>;
}

export interface ClassTemplateLesson {
  id?: string;
  title: string;
  summary?: string;
  order?: number;
  blocks?: ClassTemplateLessonBlock[];
}

export interface ClassTemplateEngineChunk {
  id: string;
  sourceType: 'lesson_block' | 'assessment_question';
  sourceId: string;
  chunkOrder: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EngineImportValidationIssue {
  path: string;
  message: string;
}

export interface EngineImportValidationSummary {
  modules: number;
  sections: number;
  items: number;
  lessons: number;
  lessonBlocks: number;
  assessments: number;
  questions: number;
  options: number;
  chunks: number;
}

export interface EngineImportValidationResult {
  valid: boolean;
  errors: EngineImportValidationIssue[];
  warnings: EngineImportValidationIssue[];
  summary: EngineImportValidationSummary;
  normalizedPreview: Record<string, unknown> | null;
}

export interface EngineTemplateExportPayload {
  fileName: string;
  yaml: string;
  manifest: Record<string, unknown>;
}

export interface EngineTemplateImportResult {
  template: ClassTemplate;
  summary: EngineImportValidationSummary;
  warnings: EngineImportValidationIssue[];
  regeneratedChunkJobs: unknown[];
}
