/**
 * Types for the AI Module Extraction feature.
 */

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'applied';

export interface ExtractionBlock {
  type: 'text' | 'image' | 'video' | 'question' | 'file' | 'divider';
  content: Record<string, unknown> | string;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface ExtractionLesson {
  title: string;
  description?: string;
  order: number;
  blocks: ExtractionBlock[];
}

export interface ExtractionAssessmentOption {
  text: string;
  isCorrect?: boolean;
  order?: number;
}

export interface ExtractionAssessmentQuestion {
  content: string;
  type?: string;
  points?: number;
  order?: number;
  explanation?: string | null;
  imageUrl?: string | null;
  conceptTags?: string[] | null;
  options?: ExtractionAssessmentOption[];
}

export interface ExtractionAssessmentDraft {
  title?: string;
  description?: string;
  type?: string;
  passingScore?: number;
  feedbackLevel?: string;
  questions?: ExtractionAssessmentQuestion[];
}

export interface ExtractionSection {
  title: string;
  description?: string;
  order: number;
  lessonBlocks: ExtractionBlock[];
  assessmentDraft?: ExtractionAssessmentDraft | null;
  confidence?: number | null;
  graphKeywords?: string[];
  figureReferences?: string[];
}

export interface ExtractionStructuredContent {
  title: string;
  description: string;
  sections: ExtractionSection[];
  audit?: {
    pipelineVersion?: string;
    overallConfidence?: number;
    warnings?: string[];
    sourceMethods?: string[];
    sectionCount?: number;
    coherenceScore?: number;
    coherenceWarnings?: string[];
    reviewFlags?: string[];
    imageAssignmentSummary?: {
      assigned?: number;
      unassigned?: number;
      reusedByCitation?: number;
    };
    documentGraph?: {
      version?: string;
      summary?: Record<string, unknown>;
    };
    pipelineStages?: string[];
    classification?: {
      safe: boolean;
      category: string;
      confidence: number;
      reason: string;
    };
    sanitizationWarnings?: string[];
    chunkWarnings?: string[];
    chunkCount?: number;
    pageCount?: number;
    sourceDocument?: string;
  };
}

export interface Extraction {
  id: string;
  fileId: string;
  classId: string;
  teacherId: string;
  extractionStatus: ExtractionStatus;
  modelUsed: string | null;
  errorMessage?: string | null;
  structuredContent: ExtractionStructuredContent | null;
  isApplied: boolean;
  progressPercent: number;
  totalChunks: number | null;
  processedChunks: number;
  createdAt: string;
  updatedAt: string;
  originalName?: string;
}

export interface ExtractModuleDto {
  fileId: string;
}

export interface ApplyExtractionDto {
  sectionIndices?: number[];
  lessonIndices?: number[];
}

export interface UpdateExtractionDto {
  title?: string;
  description?: string;
  sections?: ExtractionSection[];
  lessons?: ExtractionLesson[];
}
