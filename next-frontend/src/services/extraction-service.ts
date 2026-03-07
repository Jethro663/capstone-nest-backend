import { api } from '@/lib/api-client';
import type {
  ApplyExtractionDto,
  Extraction,
  ExtractModuleDto,
  UpdateExtractionDto,
} from '@/types/extraction';

function normalizeExtraction(raw: Record<string, any>): Extraction {
  return {
    id: raw.id,
    fileId: raw.fileId ?? raw.file_id,
    classId: raw.classId ?? raw.class_id,
    teacherId: raw.teacherId ?? raw.teacher_id,
    extractionStatus: raw.extractionStatus ?? raw.extraction_status,
    modelUsed: raw.modelUsed ?? raw.model_used ?? null,
    errorMessage: raw.errorMessage ?? raw.error_message ?? null,
    structuredContent: raw.structuredContent ?? raw.structured_content ?? null,
    isApplied: raw.isApplied ?? raw.is_applied ?? false,
    progressPercent: raw.progressPercent ?? raw.progress_percent ?? 0,
    totalChunks: raw.totalChunks ?? raw.total_chunks ?? null,
    processedChunks: raw.processedChunks ?? raw.processed_chunks ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
    originalName: raw.originalName ?? raw.original_name ?? null,
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
      data: normalizeExtraction(data.data),
    };
  },

  async update(
    id: string,
    dto: UpdateExtractionDto,
  ): Promise<{ success: boolean; message: string; data: Extraction }> {
    const { data } = await api.patch(`/ai/extractions/${id}`, dto);
    return {
      ...data,
      data: normalizeExtraction(data.data),
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
