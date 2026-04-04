import { api } from '@/lib/api-client';
import type {
  ApplyExtractionDto,
  Extraction,
  ExtractModuleDto,
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

function normalizeExtraction(raw: RawExtraction): Extraction {
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
    structuredContent: (raw.structuredContent ??
      raw.structured_content ??
      null) as Extraction['structuredContent'],
    isApplied: readBoolean(raw.isApplied ?? raw.is_applied),
    progressPercent: readNumber(raw.progressPercent ?? raw.progress_percent),
    totalChunks: readNullableNumber(raw.totalChunks ?? raw.total_chunks),
    processedChunks: readNumber(raw.processedChunks ?? raw.processed_chunks),
    createdAt: readString(raw.createdAt ?? raw.created_at),
    updatedAt: readString(raw.updatedAt ?? raw.updated_at),
    originalName:
      readNullableString(raw.originalName ?? raw.original_name) ?? undefined,
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
    data: { lessonsCreated: number; lessons: unknown[] };
  }> {
    const { data } = await api.post(`/ai/extractions/${id}/apply`, dto || {});
    return data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/ai/extractions/${id}`);
    return data;
  },
};
