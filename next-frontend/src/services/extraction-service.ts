import { api } from '@/lib/api-client';
import type {
  Extraction,
  ExtractModuleDto,
  ApplyExtractionDto,
  UpdateExtractionDto,
} from '@/types/extraction';

export const extractionService = {
  /** POST /ai/extract-module — Teacher, Admin */
  async extractModule(
    dto: ExtractModuleDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: { extractionId: string; status: string; message: string };
  }> {
    const { data } = await api.post('/ai/extract-module', dto);
    return data;
  },

  /** GET /ai/extractions/:id/status — Teacher, Admin (polling) */
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
    };
  }> {
    const { data } = await api.get(`/ai/extractions/${id}/status`);
    return data;
  },

  /** GET /ai/extractions?classId=... — Teacher, Admin */
  async listByClass(
    classId: string,
  ): Promise<{ success: boolean; message: string; data: Extraction[] }> {
    const { data } = await api.get('/ai/extractions', {
      params: { classId },
    });
    return data;
  },

  /** GET /ai/extractions/:id — Teacher, Admin */
  async getById(
    id: string,
  ): Promise<{ success: boolean; message: string; data: Extraction }> {
    const { data } = await api.get(`/ai/extractions/${id}`);
    return data;
  },

  /** PATCH /ai/extractions/:id — Teacher, Admin */
  async update(
    id: string,
    dto: UpdateExtractionDto,
  ): Promise<{ success: boolean; message: string; data: Extraction }> {
    const { data } = await api.patch(`/ai/extractions/${id}`, dto);
    return data;
  },

  /** POST /ai/extractions/:id/apply — Teacher, Admin */
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

  /** DELETE /ai/extractions/:id — Teacher, Admin */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/ai/extractions/${id}`);
    return data;
  },
};
