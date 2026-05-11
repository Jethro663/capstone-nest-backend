import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
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
};
