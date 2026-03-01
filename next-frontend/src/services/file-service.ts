import { api } from '@/lib/api-client';
import type { UploadedFile, StorageSummary } from '@/types/file';

export const fileService = {
  /** POST /files/upload?classId=... — Teacher (multipart: file) */
  async upload(file: File, classId: string): Promise<{ success: boolean; message: string; data: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);
    // Pass classId as a query parameter instead of a form field
    const { data } = await api.post(`/files/upload?classId=${classId}`, formData, {
      timeout: 120_000, // 2 min for large PDFs
    });
    return data;
  },

  /** GET /files — Admin, Teacher */
  async getAll(): Promise<{ success: boolean; message: string; data: UploadedFile[]; count: number }> {
    const { data } = await api.get('/files');
    return data;
  },

  /** GET /files/storage-summary — Admin */
  async getStorageSummary(): Promise<{ success: boolean; message: string; data: StorageSummary }> {
    const { data } = await api.get('/files/storage-summary');
    return data;
  },

  /** GET /files/:id — Admin, Teacher */
  async getById(id: string): Promise<{ success: boolean; message: string; data: UploadedFile }> {
    const { data } = await api.get(`/files/${id}`);
    return data;
  },

  /** GET /files/:id/download — Admin, Teacher (PDF stream) */
  async download(id: string): Promise<Blob> {
    const { data } = await api.get(`/files/${id}/download`, { responseType: 'blob' });
    return data;
  },

  /** DELETE /files/:id — Admin, Teacher */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/files/${id}`);
    return data;
  },
};
