export type ExtractionStatus = "pending" | "processing" | "completed" | "failed" | "applied";
export type ExtractionStyle = "faithful" | "clean" | "student_friendly";

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
  folderId?: string | null;
  teacherId?: string;
  originalName: string;
  storedName?: string;
  filename?: string;
  mimeType: string;
  sizeBytes: number;
  filePath?: string;
  classId?: string | null;
  scope?: "private" | "general";
  subjectKey?: LibrarySubjectKey | null;
  gradeLevel?: LibraryGradeLevel | null;
  teacherVisible?: boolean;
  aiEnabled?: boolean;
  indexStatus?: "not_indexed" | "pending" | "processing" | "completed" | "failed";
  indexError?: string | null;
  indexedAt?: string | null;
  contentHash?: string | null;
  fileKind?: "pdf" | "txt" | "pptx" | "document" | "image" | "file";
  uploadedAt?: string;
  createdAt?: string;
  deletedAt?: string | null;
  folder?: LibraryFolder | null;
}

export interface LibraryFolder {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string | null;
  scope: "private" | "general";
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LibraryStorageSummary {
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
}

export interface ExtractionBlock {
  type: "text" | "image" | "video" | "question" | "file" | "divider";
  content: Record<string, unknown> | string;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface ExtractionReviewIssue {
  id: string;
  code: string;
  severity: "info" | "warning" | "blocking";
  scope: "module" | "section" | "block";
  message: string;
  sectionIndex?: number | null;
  blockIndex?: number | null;
  resolved: boolean;
  resolution?: string | null;
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
  reviewState?: string | null;
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
    extractionStyle?: ExtractionStyle;
    reviewState?: string;
    reviewIssues?: ExtractionReviewIssue[];
    applyResult?: ApplyExtractionResult;
    retryOfExtractionId?: string;
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
  extractionStyle?: ExtractionStyle;
}

export interface RetryExtractionDto {
  targetSectionCount?: 3 | 4 | 5;
  extractionStyle?: ExtractionStyle;
}

export interface ExtractionStatusResult {
  id: string;
  status: ExtractionStatus;
  progressPercent: number;
  totalChunks: number | null;
  processedChunks: number;
  modelUsed: string | null;
  errorMessage?: string | null;
}

export interface ApplyExtractionPreviewSection {
  title: string;
  sourceSectionIndex?: number;
  lessonBlocks?: number;
  assessmentQuestions?: number;
}

export interface ApplyExtractionResult {
  alreadyApplied?: boolean;
  moduleId?: string;
  moduleTitle?: string;
  moduleDescription?: string;
  sectionsCreated?: number;
  lessonsCreated: number;
  assessmentsCreated?: number;
  totalSectionsAvailable?: number;
  totalLessonsAvailable?: number;
  blockedReasons?: string[];
  sections?: ApplyExtractionPreviewSection[];
  lessons?: unknown[];
  assessments?: unknown[];
  indexing?: Record<string, unknown>;
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
  reviewIssues?: ExtractionReviewIssue[];
  reviewState?: string;
  mediaAssets?: ExtractionMediaAsset[];
}
