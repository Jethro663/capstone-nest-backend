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

export interface ExtractionStructuredContent {
  title: string;
  description: string;
  lessons: ExtractionLesson[];
  audit?: {
    pipelineVersion?: string;
    overallConfidence?: number;
    warnings?: string[];
    sourceMethods?: string[];
    sectionCount?: number;
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
  lessonIndices?: number[];
}

export interface UpdateExtractionDto {
  title?: string;
  description?: string;
  lessons: ExtractionLesson[];
}
