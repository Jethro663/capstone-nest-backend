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
  order?: number;
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
}

export interface CreateClassTemplateDto {
  name: string;
  subjectCode: string;
  subjectGradeLevel: string;
}
