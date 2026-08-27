import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  ApplyExtractionDto,
  ApplyExtractionResult,
  ExtractModuleDto,
  Extraction,
  ExtractionAssessmentDraft,
  ExtractionAssessmentOption,
  ExtractionAssessmentQuestion,
  ExtractionBlock,
  ExtractionMediaAsset,
  ExtractionMediaCandidate,
  ExtractionSection,
  ExtractionStatusResult,
  ExtractionStructuredContent,
  RetryExtractionDto,
  UpdateExtractionDto,
} from "../../types/extraction";

type RawRecord = Record<string, unknown>;

const STATUS_VALUES = new Set(["pending", "processing", "completed", "failed", "applied"]);

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeStatus(value: unknown): Extraction["extractionStatus"] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (STATUS_VALUES.has(normalized)) {
      return normalized as Extraction["extractionStatus"];
    }
  }
  return "processing";
}

function normalizeBlock(raw: unknown, fallbackOrder: number): ExtractionBlock {
  const block = raw && typeof raw === "object" ? (raw as RawRecord) : {};
  const type = readString(block.type, "text");
  return {
    type: (["text", "image", "video", "question", "file", "divider"].includes(type)
      ? type
      : "text") as ExtractionBlock["type"],
    content:
      typeof block.content === "string" || (block.content && typeof block.content === "object")
        ? (block.content as ExtractionBlock["content"])
        : { text: "" },
    order: readNumber(block.order, fallbackOrder),
    metadata: block.metadata && typeof block.metadata === "object" ? (block.metadata as Record<string, unknown>) : undefined,
  };
}

function normalizeAssessmentDraft(raw: unknown): ExtractionAssessmentDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const draft = raw as RawRecord;
  const questions = Array.isArray(draft.questions)
    ? draft.questions
        .map((question, index) => normalizeAssessmentQuestion(question, index + 1))
        .filter((question): question is ExtractionAssessmentQuestion => Boolean(question))
    : [];
  if (questions.length === 0) return null;
  return {
    title: readString(draft.title),
    description: readString(draft.description),
    type: readString(draft.type, "quiz"),
    passingScore: readNumber(draft.passingScore, 60),
    feedbackLevel: readString(draft.feedbackLevel, "standard"),
    questions,
  };
}

function normalizeAssessmentOption(raw: unknown, fallbackOrder: number): ExtractionAssessmentOption | null {
  if (!raw || typeof raw !== "object") return null;
  const option = raw as RawRecord;
  const text = readString(option.text).trim();
  if (!text) return null;
  return {
    text,
    isCorrect: typeof option.isCorrect === "boolean" ? option.isCorrect : undefined,
    order: readNumber(option.order, fallbackOrder),
  };
}

function normalizeAssessmentQuestion(raw: unknown, fallbackOrder: number): ExtractionAssessmentQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const question = raw as RawRecord;
  const content = readString(question.content).trim();
  if (!content) return null;
  return {
    content,
    type: readString(question.type, "multiple_choice"),
    points: readNumber(question.points, 1),
    order: readNumber(question.order, fallbackOrder),
    explanation: readNullableString(question.explanation),
    imageUrl: readNullableString(question.imageUrl),
    conceptTags: Array.isArray(question.conceptTags)
      ? question.conceptTags.map((entry) => readString(entry).trim()).filter(Boolean)
      : undefined,
    options: Array.isArray(question.options)
      ? question.options
          .map((option, index) => normalizeAssessmentOption(option, index + 1))
          .filter((option): option is ExtractionAssessmentOption => Boolean(option))
      : undefined,
  };
}

function normalizeSection(raw: unknown, fallbackOrder: number): ExtractionSection {
  const section = raw && typeof raw === "object" ? (raw as RawRecord) : {};
  const rawBlocks = Array.isArray(section.lessonBlocks)
    ? section.lessonBlocks
    : Array.isArray(section.blocks)
      ? section.blocks
      : [];
  return {
    title: readString(section.title, `Section ${fallbackOrder}`),
    description: readString(section.description),
    order: readNumber(section.order, fallbackOrder),
    lessonBlocks: rawBlocks.map((block, index) => normalizeBlock(block, index + 1)),
    assessmentDraft: normalizeAssessmentDraft(section.assessmentDraft),
    confidence: readNullableNumber(section.confidence),
    graphKeywords: Array.isArray(section.graphKeywords)
      ? section.graphKeywords.map((entry) => readString(entry).trim()).filter(Boolean)
      : undefined,
    figureReferences: Array.isArray(section.figureReferences)
      ? section.figureReferences.map((entry) => readString(entry).trim()).filter(Boolean)
      : undefined,
    reviewState: readNullableString(section.reviewState),
  };
}

function normalizeMediaCandidate(raw: unknown): ExtractionMediaCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as RawRecord;
  const sectionIndex = readNullableNumber(candidate.sectionIndex);
  const score = readNullableNumber(candidate.score);
  if (sectionIndex === null || score === null) return null;
  return {
    sectionIndex,
    score,
    explicitMatch: typeof candidate.explicitMatch === "boolean" ? candidate.explicitMatch : undefined,
    scoreBreakdown:
      candidate.scoreBreakdown && typeof candidate.scoreBreakdown === "object"
        ? Object.fromEntries(
            Object.entries(candidate.scoreBreakdown as RawRecord)
              .map(([key, value]) => [key, readNullableNumber(value)])
              .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined,
  };
}

function normalizeMediaAsset(raw: unknown): ExtractionMediaAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const asset = raw as RawRecord;
  const id = readString(asset.id).trim();
  const url = readString(asset.url).trim();
  if (!id || !url) return null;
  return {
    id,
    url,
    pageNumber: readNullableNumber(asset.pageNumber),
    caption: readNullableString(asset.caption),
    anchorText: readNullableString(asset.anchorText),
    keywords: Array.isArray(asset.keywords) ? asset.keywords.map((entry) => readString(entry).trim()).filter(Boolean) : [],
    figureReferences: Array.isArray(asset.figureReferences)
      ? asset.figureReferences.map((entry) => readString(entry).trim()).filter(Boolean)
      : [],
    selectedSectionIndex: readNullableNumber(asset.selectedSectionIndex),
    assignmentConfidence: readNullableNumber(asset.assignmentConfidence),
    assignmentBreakdown:
      asset.assignmentBreakdown && typeof asset.assignmentBreakdown === "object"
        ? Object.fromEntries(
            Object.entries(asset.assignmentBreakdown as RawRecord)
              .map(([key, value]) => [key, readNullableNumber(value)])
              .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined,
    candidateSections: Array.isArray(asset.candidateSections)
      ? asset.candidateSections
          .map(normalizeMediaCandidate)
          .filter((entry): entry is ExtractionMediaCandidate => Boolean(entry))
      : [],
    teacherReviewed: readBoolean(asset.teacherReviewed),
    reviewState: readNullableString(asset.reviewState),
  };
}

function normalizeStructuredContent(raw: unknown): ExtractionStructuredContent | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as RawRecord;
  const rawSections = Array.isArray(payload.sections)
    ? payload.sections
    : Array.isArray(payload.lessons)
      ? payload.lessons.map((lesson, index) => {
          const legacy = lesson && typeof lesson === "object" ? (lesson as RawRecord) : {};
          return {
            title: legacy.title ?? `Section ${index + 1}`,
            description: legacy.description ?? "",
            order: index + 1,
            lessonBlocks: Array.isArray(legacy.blocks) ? legacy.blocks : [],
          };
        })
      : [];
  return {
    title: readString(payload.title, "Extracted Module"),
    description: readString(payload.description),
    sections: rawSections.map((section, index) => normalizeSection(section, index + 1)),
    mediaAssets: Array.isArray(payload.mediaAssets)
      ? payload.mediaAssets.map(normalizeMediaAsset).filter((entry): entry is ExtractionMediaAsset => Boolean(entry))
      : [],
    audit: payload.audit && typeof payload.audit === "object" ? (payload.audit as ExtractionStructuredContent["audit"]) : undefined,
  };
}

function normalizeExtraction(raw: unknown): Extraction {
  const record = raw && typeof raw === "object" ? (raw as RawRecord) : {};
  const rawRepairNotes = record.repairNotes ?? record.repair_notes;
  return {
    id: readString(record.id),
    fileId: readString(record.fileId ?? record.file_id),
    classId: readString(record.classId ?? record.class_id),
    teacherId: readString(record.teacherId ?? record.teacher_id),
    extractionStatus: normalizeStatus(record.extractionStatus ?? record.extraction_status),
    modelUsed: readNullableString(record.modelUsed ?? record.model_used),
    errorMessage: readNullableString(record.errorMessage ?? record.error_message),
    structuredContent: normalizeStructuredContent(record.structuredContent ?? record.structured_content),
    isApplied: readBoolean(record.isApplied ?? record.is_applied),
    progressPercent: readNumber(record.progressPercent ?? record.progress_percent),
    totalChunks: readNullableNumber(record.totalChunks ?? record.total_chunks),
    processedChunks: readNumber(record.processedChunks ?? record.processed_chunks),
    createdAt: readString(record.createdAt ?? record.created_at),
    updatedAt: readString(record.updatedAt ?? record.updated_at),
    originalName: readNullableString(record.originalName ?? record.original_name) ?? undefined,
    qualityGate: readNullableString(record.qualityGate ?? record.quality_gate),
    reviewRequired: readBoolean(record.reviewRequired ?? record.review_required),
    confidenceBreakdown:
      record.confidenceBreakdown && typeof record.confidenceBreakdown === "object"
        ? (record.confidenceBreakdown as Record<string, unknown>)
        : record.confidence_breakdown && typeof record.confidence_breakdown === "object"
          ? (record.confidence_breakdown as Record<string, unknown>)
          : undefined,
    repairNotes: Array.isArray(rawRepairNotes)
      ? rawRepairNotes.map((entry) => readString(entry).trim()).filter(Boolean)
      : undefined,
  };
}

export const extractionsApi = {
  async start(payload: ExtractModuleDto) {
    const response = await apiClient.post<ApiEnvelope<{ extractionId: string; status: string; message?: string }>>(
      "/ai/extract-module",
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async listByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Extraction[] | RawRecord[]>>("/ai/extractions", {
      params: { classId },
    });
    const data = unwrapEnvelope(response.data);
    return Array.isArray(data) ? data.map((entry) => normalizeExtraction(entry)) : [];
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiEnvelope<Extraction | RawRecord>>(`/ai/extractions/${id}`);
    return normalizeExtraction(unwrapEnvelope(response.data));
  },

  async getStatus(id: string): Promise<ExtractionStatusResult> {
    const response = await apiClient.get<ApiEnvelope<RawRecord>>(`/ai/extractions/${id}/status`);
    const record = unwrapEnvelope(response.data);
    return {
      id: readString(record.id, id),
      status: normalizeStatus(record.status ?? record.extractionStatus ?? record.extraction_status),
      progressPercent: readNumber(record.progressPercent ?? record.progress_percent),
      totalChunks: readNullableNumber(record.totalChunks ?? record.total_chunks),
      processedChunks: readNumber(record.processedChunks ?? record.processed_chunks),
      modelUsed: readNullableString(record.modelUsed ?? record.model_used),
      errorMessage: readNullableString(record.errorMessage ?? record.error_message),
    };
  },

  async apply(id: string, payload?: ApplyExtractionDto) {
    const response = await apiClient.post<ApiEnvelope<ApplyExtractionResult>>(`/ai/extractions/${id}/apply`, payload ?? {});
    return unwrapEnvelope(response.data);
  },

  async previewApply(id: string, payload?: ApplyExtractionDto) {
    const response = await apiClient.post<ApiEnvelope<ApplyExtractionResult>>(
      `/ai/extractions/${id}/apply/preview`,
      payload ?? {},
    );
    return unwrapEnvelope(response.data);
  },

  async retry(id: string, payload?: RetryExtractionDto) {
    const response = await apiClient.post<ApiEnvelope<{ extractionId: string; status?: string; retryOfExtractionId?: string }>>(
      `/ai/extractions/${id}/retry`,
      payload ?? {},
    );
    return unwrapEnvelope(response.data);
  },

  async cancel(id: string) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(`/ai/extractions/${id}/cancel`, {});
    return unwrapEnvelope(response.data);
  },

  async update(id: string, payload: UpdateExtractionDto) {
    const response = await apiClient.patch<ApiEnvelope<Extraction | RawRecord>>(`/ai/extractions/${id}`, payload);
    return normalizeExtraction(unwrapEnvelope(response.data));
  },

  async delete(id: string) {
    await apiClient.delete(`/ai/extractions/${id}`);
  },
};
