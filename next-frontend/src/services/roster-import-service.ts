import { api } from '@/lib/api-client';

export interface RosterImportPreview {
  sectionMatch: { id: string; name: string; gradeLevel: string };
  registered: RosterRegisteredRow[];
  pending: RosterPendingRow[];
  errors: RosterErrorRow[];
  summary: {
    total: number;
    registered: number;
    pending: number;
    errors: number;
  };
}

export interface RosterRegisteredRow {
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  lrn?: string;
  userId: string;
  status: string;
}

export interface RosterPendingRow {
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  lrn?: string;
  reason: string;
}

export interface RosterErrorRow {
  rowNumber: number;
  email?: string;
  error: string;
}

export interface CommitStudentRow {
  userId: string;
  lrn?: string;
}

export interface CommitPendingRow {
  email: string;
  firstName: string;
  lastName: string;
  lrn?: string;
}

export interface RosterImportCommitDto {
  registered: CommitStudentRow[];
  pending: CommitPendingRow[];
}

export interface PendingImportRow {
  id: string;
  sectionId: string;
  email: string;
  firstName: string;
  lastName: string;
  lrn?: string;
  resolvedUserId?: string;
  status: string;
  createdAt: string;
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
