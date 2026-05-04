import { api } from '@/lib/api-client';
import type {
  ApplyExtractionDto,
  Extraction,
  ExtractModuleDto,
  ExtractionAssessmentDraft,
  ExtractionAssessmentOption,
  ExtractionAssessmentQuestion,
  ExtractionBlock,
  ExtractionMediaAsset,
  ExtractionMediaCandidate,
  ExtractionSection,
  ExtractionStructuredContent,
  UpdateExtractionDto,
} from '@/types/extraction';

type RawExtraction = Record<string, unknown>;
type RawExtractionStatus = Record<string, unknown>;

const EXTRACTION_STATUS_VALUES = new Set([
  'pending',
  'processing',
  'completed',
  'failed',
  'applied',
]);

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeExtractionStatus(value: unknown): Extraction['extractionStatus'] {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (EXTRACTION_STATUS_VALUES.has(normalized)) {
      return normalized as Extraction['extractionStatus'];
    }
  }
  return 'processing';
}

function normalizeBlock(raw: unknown, fallbackOrder: number): ExtractionBlock {
  if (!raw || typeof raw !== 'object') {
    return {
      type: 'text',
      content: { text: '' },
      order: fallbackOrder,
    };
  }
  const block = raw as Record<string, unknown>;
  const rawType = readString(block.type, 'text').toLowerCase();
  const type = (
    ['text', 'image', 'video', 'question', 'file', 'divider'].includes(rawType)
      ? rawType
      : 'text'
  ) as ExtractionBlock['type'];
  const content =
    typeof block.content === 'string' ||
    (block.content && typeof block.content === 'object')
      ? (block.content as ExtractionBlock['content'])
      : ({ text: '' } as ExtractionBlock['content']);

  return {
    type,
    content,
    order: readNumber(block.order, fallbackOrder),
    metadata:
      block.metadata && typeof block.metadata === 'object'
        ? (block.metadata as Record<string, unknown>)
        : undefined,
  };
}

function normalizeAssessmentOption(raw: unknown, fallbackOrder: number): ExtractionAssessmentOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const option = raw as Record<string, unknown>;
  const text = readString(option.text).trim();
  if (!text) return null;
  return {
    text,
    isCorrect: readBoolean(option.isCorrect, false),
    order: readNumber(option.order, fallbackOrder),
  };
}

function normalizeAssessmentQuestion(
  raw: unknown,
  fallbackOrder: number,
): ExtractionAssessmentQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const question = raw as Record<string, unknown>;
  const content = readString(question.content).trim();
  if (!content) return null;
  const options = Array.isArray(question.options)
    ? question.options
        .map((opt, idx) => normalizeAssessmentOption(opt, idx + 1))
        .filter((opt): opt is ExtractionAssessmentOption => Boolean(opt))
    : undefined;
  return {
    content,
    type: readString(question.type, 'multiple_choice'),
    points: readNumber(question.points, 1),
    order: readNumber(question.order, fallbackOrder),
    explanation: readNullableString(question.explanation),
    imageUrl: readNullableString(question.imageUrl),
    conceptTags: Array.isArray(question.conceptTags)
      ? question.conceptTags.map((tag) => readString(tag)).filter((tag) => tag.length > 0)
      : undefined,
    options,
  };
}

function normalizeAssessmentDraft(raw: unknown): ExtractionAssessmentDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const draft = raw as Record<string, unknown>;
  const questions = Array.isArray(draft.questions)
    ? draft.questions
        .map((q, idx) => normalizeAssessmentQuestion(q, idx + 1))
        .filter((q): q is ExtractionAssessmentQuestion => Boolean(q))
    : [];
  if (questions.length === 0) return null;
  return {
    title: readString(draft.title, ''),
    description: readString(draft.description, ''),
    type: readString(draft.type, 'quiz'),
    passingScore: readNumber(draft.passingScore, 60),
    feedbackLevel: readString(draft.feedbackLevel, 'standard'),
    questions,
  };
}

function normalizeSection(raw: unknown, fallbackOrder: number): ExtractionSection {
  const section = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const lessonBlocksRaw = Array.isArray(section.lessonBlocks)
    ? section.lessonBlocks
    : Array.isArray(section.blocks)
      ? section.blocks
      : [];
  const lessonBlocks = lessonBlocksRaw.map((block, idx) => normalizeBlock(block, idx));
  return {
    title: readString(section.title, `Section ${fallbackOrder}`),
    description: readString(section.description, ''),
    order: readNumber(section.order, fallbackOrder),
    lessonBlocks,
    assessmentDraft: normalizeAssessmentDraft(section.assessmentDraft),
    confidence:
      typeof section.confidence === 'number' && Number.isFinite(section.confidence)
        ? section.confidence
        : null,
    graphKeywords: Array.isArray(section.graphKeywords)
      ? section.graphKeywords
          .map((item) => readString(item).trim())
          .filter((item) => item.length > 0)
      : undefined,
    figureReferences: Array.isArray(section.figureReferences)
      ? section.figureReferences
          .map((item) => readString(item).trim())
          .filter((item) => item.length > 0)
      : undefined,
  };
}

function normalizeMediaCandidate(raw: unknown): ExtractionMediaCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const sectionIndex = readNullableNumber(candidate.sectionIndex);
  const score = readNullableNumber(candidate.score);
  if (sectionIndex === null || score === null) return null;
  return {
    sectionIndex,
    score,
    explicitMatch: typeof candidate.explicitMatch === 'boolean' ? candidate.explicitMatch : undefined,
    scoreBreakdown:
      candidate.scoreBreakdown && typeof candidate.scoreBreakdown === 'object'
        ? Object.fromEntries(
            Object.entries(candidate.scoreBreakdown as Record<string, unknown>)
              .map(([key, value]) => [key, readNullableNumber(value)])
              .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined,
  };
}

function normalizeMediaAsset(raw: unknown): ExtractionMediaAsset | null {
  if (!raw || typeof raw !== 'object') return null;
  const asset = raw as Record<string, unknown>;
  const id = readString(asset.id).trim();
  const url = readString(asset.url).trim();
  if (!id || !url) return null;
  return {
    id,
    url,
    pageNumber: readNullableNumber(asset.pageNumber),
    caption: readNullableString(asset.caption),
    anchorText: readNullableString(asset.anchorText),
    keywords: Array.isArray(asset.keywords)
      ? asset.keywords.map((item) => readString(item).trim()).filter(Boolean)
      : [],
    figureReferences: Array.isArray(asset.figureReferences)
      ? asset.figureReferences.map((item) => readString(item).trim()).filter(Boolean)
      : [],
    selectedSectionIndex: readNullableNumber(asset.selectedSectionIndex),
    assignmentConfidence: readNullableNumber(asset.assignmentConfidence),
    assignmentBreakdown:
      asset.assignmentBreakdown && typeof asset.assignmentBreakdown === 'object'
        ? Object.fromEntries(
            Object.entries(asset.assignmentBreakdown as Record<string, unknown>)
              .map(([key, value]) => [key, readNullableNumber(value)])
              .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined,
    candidateSections: Array.isArray(asset.candidateSections)
      ? asset.candidateSections
          .map((candidate) => normalizeMediaCandidate(candidate))
          .filter((candidate): candidate is ExtractionMediaCandidate => Boolean(candidate))
      : [],
    teacherReviewed: readBoolean(asset.teacherReviewed, false),
    reviewState: readNullableString(asset.reviewState),
  };
}

function normalizeStructuredContent(raw: unknown): ExtractionStructuredContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as Record<string, unknown>;
  const rawSections = Array.isArray(payload.sections)
    ? payload.sections
    : Array.isArray(payload.lessons)
      ? payload.lessons.map((lesson, idx) => {
          const normalizedLesson = lesson as Record<string, unknown>;
          return {
            title: normalizedLesson?.title ?? `Section ${idx + 1}`,
            description: normalizedLesson?.description ?? '',
            order: idx + 1,
            lessonBlocks: Array.isArray(normalizedLesson?.blocks)
              ? normalizedLesson.blocks
              : [],
          };
        })
      : [];

  const sections = rawSections.map((section, idx) => normalizeSection(section, idx + 1));
  return {
    title: readString(payload.title, 'Extracted Module'),
    description: readString(payload.description, ''),
    sections,
    mediaAssets: Array.isArray(payload.mediaAssets)
      ? payload.mediaAssets
          .map((asset) => normalizeMediaAsset(asset))
          .filter((asset): asset is ExtractionMediaAsset => Boolean(asset))
      : [],
    audit:
      payload.audit && typeof payload.audit === 'object'
        ? (payload.audit as ExtractionStructuredContent['audit'])
        : undefined,
  };
}

function normalizeExtraction(raw: RawExtraction): Extraction {
  const rawRepairNotes = raw.repairNotes ?? raw.repair_notes;
  return {
    id: readString(raw.id),
    fileId: readString(raw.fileId ?? raw.file_id),
    classId: readString(raw.classId ?? raw.class_id),
    teacherId: readString(raw.teacherId ?? raw.teacher_id),
    extractionStatus: normalizeExtractionStatus(
      raw.extractionStatus ?? raw.extraction_status,
    ),
    modelUsed: readNullableString(raw.modelUsed ?? raw.model_used),
    errorMessage: readNullableString(raw.errorMessage ?? raw.error_message),
    structuredContent: normalizeStructuredContent(
      raw.structuredContent ?? raw.structured_content ?? null,
    ),
    isApplied: readBoolean(raw.isApplied ?? raw.is_applied),
    progressPercent: readNumber(raw.progressPercent ?? raw.progress_percent),
    totalChunks: readNullableNumber(raw.totalChunks ?? raw.total_chunks),
    processedChunks: readNumber(raw.processedChunks ?? raw.processed_chunks),
    createdAt: readString(raw.createdAt ?? raw.created_at),
    updatedAt: readString(raw.updatedAt ?? raw.updated_at),
    originalName:
      readNullableString(raw.originalName ?? raw.original_name) ?? undefined,
    qualityGate: readNullableString(raw.qualityGate ?? raw.quality_gate),
    reviewRequired: readBoolean(raw.reviewRequired ?? raw.review_required),
    confidenceBreakdown:
      raw.confidenceBreakdown && typeof raw.confidenceBreakdown === 'object'
        ? (raw.confidenceBreakdown as Record<string, unknown>)
        : raw.confidence_breakdown && typeof raw.confidence_breakdown === 'object'
          ? (raw.confidence_breakdown as Record<string, unknown>)
          : undefined,
    repairNotes: Array.isArray(rawRepairNotes)
      ? rawRepairNotes
          .map((note) => readString(note).trim())
          .filter(Boolean)
      : undefined,
  };
}

function normalizeExtractionStatusPayload(raw: RawExtractionStatus) {
  return {
    id: readString(raw.id),
    status: normalizeExtractionStatus(raw.status ?? raw.extractionStatus),
    progressPercent: readNumber(raw.progressPercent ?? raw.progress_percent),
    totalChunks: readNullableNumber(raw.totalChunks ?? raw.total_chunks),
    processedChunks: readNumber(raw.processedChunks ?? raw.processed_chunks),
    modelUsed: readNullableString(raw.modelUsed ?? raw.model_used),
    errorMessage: readNullableString(raw.errorMessage ?? raw.error_message),
  };
}

export const extractionService = {
  async extractModule(
    dto: ExtractModuleDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: { extractionId: string; status: string; message?: string };
  }> {
    const { data } = await api.post('/ai/extract-module', dto);
    return data;
  },

  async getStatus(
    id: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      id: string;
      status: string;
      progressPercent: number;
      totalChunks: number | null;
      processedChunks: number;
      modelUsed: string | null;
      errorMessage?: string | null;
    };
  }> {
    const { data } = await api.get(`/ai/extractions/${id}/status`);
    const rawPayload =
      data && typeof data === 'object' && data.data && typeof data.data === 'object'
        ? (data.data as RawExtractionStatus)
        : {};

    return {
      ...data,
      data: normalizeExtractionStatusPayload(rawPayload),
    };
  },

  async listByClass(
    classId: string,
  ): Promise<{ success: boolean; message: string; data: Extraction[] }> {
    const { data } = await api.get('/ai/extractions', {
      params: { classId },
    });

    return {
      ...data,
      data: Array.isArray(data.data) ? data.data.map(normalizeExtraction) : [],
    };
  },

  async getById(
    id: string,
  ): Promise<{ success: boolean; message: string; data: Extraction }> {
    const { data } = await api.get(`/ai/extractions/${id}`);
    return {
      ...data,
      data: normalizeExtraction(data.data as RawExtraction),
    };
  },

  async update(
    id: string,
    dto: UpdateExtractionDto,
  ): Promise<{ success: boolean; message: string; data: Extraction }> {
    const { data } = await api.patch(`/ai/extractions/${id}`, dto);
    return {
      ...data,
      data: normalizeExtraction(data.data as RawExtraction),
    };
  },

  async apply(
    id: string,
    dto?: ApplyExtractionDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      moduleId?: string;
      sectionsCreated?: number;
      lessonsCreated: number;
      assessmentsCreated?: number;
      sections?: unknown[];
      lessons: unknown[];
      assessments?: unknown[];
    };
  }> {
    const { data } = await api.post(`/ai/extractions/${id}/apply`, dto || {});
    return data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/ai/extractions/${id}`);
    return data;
  },
};
