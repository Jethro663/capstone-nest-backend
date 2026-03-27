import { api } from '@/lib/api-client';
import type {
  ApplyExtractionDto,
  Extraction,
  ExtractModuleDto,
  UpdateExtractionDto,
} from '@/types/extraction';

type RawExtraction = Record<string, unknown>;

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeExtraction(raw: RawExtraction): Extraction {
  return {
    id: readString(raw.id),
    fileId: readString(raw.fileId ?? raw.file_id),
    classId: readString(raw.classId ?? raw.class_id),
    teacherId: readString(raw.teacherId ?? raw.teacher_id),
    extractionStatus: readString(
      raw.extractionStatus ?? raw.extraction_status,
    ) as Extraction['extractionStatus'],
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
    return data;
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
