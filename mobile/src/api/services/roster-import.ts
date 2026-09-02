import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";

export type RosterParsedName = { lastName: string; firstName: string; middleName: string };
export type RosterImportPreview = {
  sectionMatch: { fileHeader: string; foundSection: { id: string; name: string; gradeLevel: string } };
  registered: Array<{ rowNumber: number; email: string; name: RosterParsedName; lrn: string; userId: string; alreadyEnrolled: boolean; status?: string }>;
  pending: Array<{ rowNumber: number; email: string; name: RosterParsedName; lrn: string; reason?: string }>;
  errors: Array<{ rowNumber: number; rawData?: string[]; email?: string; issues: string[] }>;
  summary: { totalDataRows: number; validRows: number; registeredCount: number; alreadyEnrolledCount: number; pendingCount: number; errorCount: number };
};

export const rosterImportApi = {
  async preview(sectionId: string, file: { uri: string; name: string; type?: string | null }) {
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } as never);
    const response = await apiClient.post<ApiEnvelope<RosterImportPreview>>(`/roster-import/${sectionId}/preview`, form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
    return unwrapEnvelope(response.data);
  },
  async commit(sectionId: string, preview: RosterImportPreview) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(`/roster-import/${sectionId}/commit`, {
      sectionId,
      enrolledRows: preview.registered.filter((row) => !row.alreadyEnrolled).map((row) => ({ userId: row.userId, name: row.name, lrn: row.lrn, email: row.email })),
      pendingRows: preview.pending.map((row) => ({ name: row.name, lrn: row.lrn, email: row.email })),
    });
    return unwrapEnvelope(response.data);
  },
  async getPending(sectionId: string) {
    const response = await apiClient.get<ApiEnvelope<Array<Record<string, unknown>>>>(`/roster-import/${sectionId}/pending`);
    return normalizeArray<Record<string, unknown>>(unwrapEnvelope(response.data));
  },
  async resolvePending(id: string, resolvedUserId?: string) {
    return unwrapEnvelope((await apiClient.patch<ApiEnvelope<Record<string, unknown>>>(`/roster-import/pending/${id}/resolve`, { resolvedUserId })).data);
  },
};
