export type ExtractionStatus = "pending" | "processing" | "completed" | "failed" | "applied";

export type LibrarySubjectKey =
  | "math"
  | "science"
  | "english"
  | "filipino"
  | "ap"
  | "tle"
  | "mapeh"
  | "esp";

export type LibraryGradeLevel = "7" | "8" | "9" | "10";

export interface UploadedLibraryFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  classId?: string | null;
  subjectKey?: LibrarySubjectKey | null;
  gradeLevel?: LibraryGradeLevel | null;
  aiEnabled?: boolean;
}

export interface ExtractionBlock {
  type: "text" | "image" | "video" | "question" | "file" | "divider";
  content: Record<string, unknown> | string;
  order: number;
  metadata?: Record<string, unknown>;
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

export interface ExtractionMediaCandidate {
  sectionIndex: number;
  score: number;
  explicitMatch?: boolean;
  scoreBreakdown?: Record<string, number>;
}

export interface ExtractionMediaAsset {
  id: string;
  url: string;
  pageNumber?: number | null;
  caption?: string | null;
  anchorText?: string | null;
  keywords?: string[];
  figureReferences?: string[];
  selectedSectionIndex?: number | null;
  assignmentConfidence?: number | null;
  assignmentBreakdown?: Record<string, number>;
  candidateSections: ExtractionMediaCandidate[];
  teacherReviewed?: boolean;
  reviewState?: string | null;
}

export interface ExtractionStructuredContent {
  title: string;
  description: string;
  sections: ExtractionSection[];
  mediaAssets: ExtractionMediaAsset[];
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
    requestedSectionCount?: number;
    finalSectionCount?: number;
    sectionCountAdjustmentReason?: string | null;
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
  qualityGate?: string | null;
  reviewRequired?: boolean;
  confidenceBreakdown?: Record<string, unknown>;
  repairNotes?: string[];
}

export interface ExtractModuleDto {
  fileId: string;
  targetSectionCount: 3 | 4 | 5;
}

export interface ApplyExtractionDto {
  sectionIndices?: number[];
  lessonIndices?: number[];
}

export interface UpdateExtractionDto {
  title?: string;
  description?: string;
  sections?: ExtractionSection[];
  mediaAssets?: ExtractionMediaAsset[];
}
