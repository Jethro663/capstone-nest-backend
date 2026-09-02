import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import { fetchAllPages, normalizePageEnvelope } from "../pagination";
import { downloadProtectedFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type { LibraryFolder, LibraryGradeLevel, LibraryStorageSummary, LibrarySubjectKey, UploadedLibraryFile } from "../../types/extraction";

export type FileLibraryQuery = {
  classId?: string;
  folderId?: string;
  ownerId?: string;
  scope?: "private" | "general";
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
  teacherVisible?: boolean;
  aiEnabled?: boolean;
  indexStatus?: "not_indexed" | "pending" | "processing" | "completed" | "failed";
  search?: string;
  page?: number;
  limit?: number;
};

export const fileUploadApi = {
  async getPage(query: FileLibraryQuery = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const response = await apiClient.get<ApiEnvelope<UploadedLibraryFile[]>>("/files", {
      params: { ...query, page, limit },
    });
    return normalizePageEnvelope(response.data, page, limit);
  },

  async getAllPage(query: Omit<FileLibraryQuery, "page" | "limit"> = {}) {
    return fetchAllPages(
      (page, limit) => fileUploadApi.getPage({ ...query, page, limit }),
      { key: (file) => file.id },
    );
  },

  async getAll(query: Omit<FileLibraryQuery, "page" | "limit"> = {}) {
    return (await fileUploadApi.getAllPage(query)).data;
  },

  async getFolders(query: FileLibraryQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<LibraryFolder[]>>("/files/folders", { params: query });
    return unwrapEnvelope(response.data);
  },

  async createFolder(payload: { name: string; parentId?: string; scope?: "private" | "general" }) {
    const response = await apiClient.post<ApiEnvelope<LibraryFolder>>("/files/folders", payload);
    return unwrapEnvelope(response.data);
  },

  async updateFolder(id: string, payload: { name?: string; parentId?: string | null; scope?: "private" | "general" }) {
    const response = await apiClient.patch<ApiEnvelope<LibraryFolder>>(`/files/folders/${id}`, payload);
    return unwrapEnvelope(response.data);
  },

  async deleteFolder(id: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/files/folders/${id}`);
    return response.data;
  },

  async getStorageSummary() {
    const response = await apiClient.get<ApiEnvelope<LibraryStorageSummary>>("/files/storage-summary");
    return unwrapEnvelope(response.data);
  },

  async upload(
    file: { uri: string; name: string; type?: string | null },
    options: {
      classId?: string;
      folderId?: string;
      scope?: "private" | "general";
      subjectKey?: LibrarySubjectKey;
      gradeLevel?: LibraryGradeLevel;
      teacherVisible?: boolean;
      aiEnabled?: boolean;
    } = {},
  ) {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/pdf",
    } as never);

    const response = await apiClient.post<ApiEnvelope<UploadedLibraryFile>>("/files/upload", formData, {
      params: options,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000,
    });

    return unwrapEnvelope(response.data);
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiEnvelope<UploadedLibraryFile & {
      scope?: "private" | "general";
      uploadedAt?: string;
      indexStatus?: string | null;
      teacherVisible?: boolean;
    }>>(`/files/${id}`);
    return unwrapEnvelope(response.data);
  },

  async update(
    id: string,
    payload: {
      originalName?: string;
      folderId?: string | null;
      classId?: string | null;
      scope?: "private" | "general";
      subjectKey?: LibrarySubjectKey;
      gradeLevel?: LibraryGradeLevel;
      teacherVisible?: boolean;
      aiEnabled?: boolean;
    },
  ) {
    const response = await apiClient.patch<ApiEnvelope<UploadedLibraryFile>>(`/files/${id}`, payload);
    return unwrapEnvelope(response.data);
  },

  async open(id: string, fallbackName = "module-file") {
    return downloadProtectedFile({
      pathname: `/files/${id}/download`,
      fallbackName,
      openAfterDownload: true,
    });
  },

  async download(id: string, fallbackName = "module-file") {
    return downloadProtectedFile({
      pathname: `/files/${id}/download`,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },

  async delete(id: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/files/${id}`);
    return unwrapEnvelope(response.data);
  },

  async retryIndex(id: string) {
    const response = await apiClient.post<ApiEnvelope<UploadedLibraryFile>>(`/files/${id}/index/retry`);
    return unwrapEnvelope(response.data);
  },
};
