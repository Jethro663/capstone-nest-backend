import { api } from '@/lib/api-client';
import type {
  FileLibraryResponse,
  FileLibraryQuery,
  LibraryFolder,
  StorageSummary,
  UploadedFile,
} from '@/types/file';

export const fileService = {
  async upload(
    file: File,
    options: {
      classId?: string;
      folderId?: string;
      scope?: 'private' | 'general';
    } = {},
  ): Promise<{ success: boolean; message: string; data: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/files/upload', formData, {
      params: options,
      timeout: 120_000,
    });
    return data;
  },

  async getAll(
    query: FileLibraryQuery = {},
  ): Promise<FileLibraryResponse<UploadedFile>> {
    const { data } = await api.get('/files', { params: query });
    return data;
  },

  async getFolders(
    query: FileLibraryQuery = {},
  ): Promise<{ success: boolean; message: string; data: LibraryFolder[]; count: number }> {
    const { data } = await api.get('/files/folders', { params: query });
    return data;
  },

  async createFolder(dto: {
    name: string;
    parentId?: string;
    scope?: 'private' | 'general';
  }): Promise<{ success: boolean; message: string; data: LibraryFolder }> {
    const { data } = await api.post('/files/folders', dto);
    return data;
  },

  async updateFolder(
    id: string,
    dto: { name?: string; parentId?: string | null; scope?: 'private' | 'general' },
  ): Promise<{ success: boolean; message: string; data: LibraryFolder }> {
    const { data } = await api.patch(`/files/folders/${id}`, dto);
    return data;
  },

  async deleteFolder(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/files/folders/${id}`);
    return data;
  },

  async getStorageSummary(): Promise<{ success: boolean; message: string; data: StorageSummary }> {
    const { data } = await api.get('/files/storage-summary');
    return data;
  },

  async getById(id: string): Promise<{ success: boolean; message: string; data: UploadedFile }> {
    const { data } = await api.get(`/files/${id}`);
    return data;
  },

  async update(
    id: string,
    dto: {
      originalName?: string;
      folderId?: string | null;
      classId?: string | null;
      scope?: 'private' | 'general';
    },
  ): Promise<{ success: boolean; message: string; data: UploadedFile }> {
    const { data } = await api.patch(`/files/${id}`, dto);
    return data;
  },

  async download(id: string): Promise<Blob> {
    const { data } = await api.get(`/files/${id}/download`, { responseType: 'blob' });
    return data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/files/${id}`);
    return data;
  },
};
