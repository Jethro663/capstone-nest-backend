import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { ApplyExtractionDto, ExtractModuleDto, Extraction, UpdateExtractionDto } from "../../types/extraction";

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
    structuredContent:
      record.structuredContent && typeof record.structuredContent === "object"
        ? (record.structuredContent as Extraction["structuredContent"])
        : record.structured_content && typeof record.structured_content === "object"
          ? (record.structured_content as Extraction["structuredContent"])
          : null,
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

  async apply(id: string, payload?: ApplyExtractionDto) {
    const response = await apiClient.post<
      ApiEnvelope<{
        moduleId?: string;
        sectionsCreated?: number;
        lessonsCreated: number;
        assessmentsCreated?: number;
        sections?: unknown[];
        lessons: unknown[];
        assessments?: unknown[];
      }>
    >(`/ai/extractions/${id}/apply`, payload ?? {});
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
