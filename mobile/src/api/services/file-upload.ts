import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import { downloadProtectedFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type { LibraryGradeLevel, LibrarySubjectKey, UploadedLibraryFile } from "../../types/extraction";

export const fileUploadApi = {
  async upload(
    file: { uri: string; name: string; type?: string | null },
    options: {
      classId?: string;
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
};
