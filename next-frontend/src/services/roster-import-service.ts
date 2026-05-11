import { api } from '@/lib/api-client';

export interface RosterParsedName {
  lastName: string;
  firstName: string;
  middleName: string;
}

export interface RosterImportPreview {
  sectionMatch: {
    fileHeader: string;
    foundSection: { id: string; name: string; gradeLevel: string };
  };
  registered: RosterRegisteredRow[];
  pending: RosterPendingRow[];
  errors: RosterErrorRow[];
  summary: {
    totalDataRows: number;
    validRows: number;
    registeredCount: number;
    alreadyEnrolledCount: number;
    pendingCount: number;
    errorCount: number;
  };
}

export interface RosterRegisteredRow {
  rowNumber: number;
  email: string;
  name: RosterParsedName;
  lrn: string;
  userId: string;
  alreadyEnrolled: boolean;
  status?: string;
}

export interface RosterPendingRow {
  rowNumber: number;
  email: string;
  name: RosterParsedName;
  lrn: string;
  reason?: string;
}

export interface RosterErrorRow {
  rowNumber: number;
  rawData?: string[];
  email?: string;
  issues: string[];
}

export interface CommitStudentRow {
  userId: string;
  name: RosterParsedName;
  lrn: string;
  email: string;
}

export interface CommitPendingRow {
  name: RosterParsedName;
  lrn: string;
  email: string;
}

export interface RosterImportCommitDto {
  sectionId: string;
  enrolledRows: CommitStudentRow[];
  pendingRows: CommitPendingRow[];
}

export interface PendingImportRow {
  id: string;
  sectionId: string;
  email?: string;
  rosterEmail?: string;
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  lrn?: string;
  resolvedUserId?: string;
  resolvedAt?: string | null;
  status?: string;
  createdAt?: string;
  importedAt?: string;
}

export const rosterImportService = {
  /** POST /roster-import/:sectionId/preview — Admin, Teacher (multipart: file) */
  async preview(sectionId: string, file: File): Promise<{ success: boolean; data: RosterImportPreview }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/roster-import/${sectionId}/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** POST /roster-import/:sectionId/commit — Admin, Teacher */
  async commit(sectionId: string, dto: RosterImportCommitDto): Promise<{ success: boolean; message?: string; data: unknown }> {
    const { data } = await api.post(`/roster-import/${sectionId}/commit`, dto);
    return data;
  },

  /** GET /roster-import/:sectionId/pending — Admin, Teacher */
  async getPending(sectionId: string): Promise<{ success: boolean; data: PendingImportRow[] }> {
    const { data } = await api.get(`/roster-import/${sectionId}/pending`);
    return data;
  },

  /** PATCH /roster-import/pending/:id/resolve — Admin, Teacher */
  async resolve(id: string, resolvedUserId?: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.patch(`/roster-import/pending/${id}/resolve`, { resolvedUserId });
    return data;
  },
};
