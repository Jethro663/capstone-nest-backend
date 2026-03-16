import { api } from '@/lib/api-client';
import type { Section, CreateSectionDto, UpdateSectionDto } from '@/types/section';

export interface SectionsQuery {
  gradeLevel?: string;
  schoolYear?: string;
  isActive?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SectionsListResponse {
  success: boolean;
  data: Section[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RosterStudent {
  id: string;
  enrollmentId?: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  lrn?: string;
  gradeLevel?: string;
  profilePicture?: string;
}

export interface TeacherSectionStudentProfile {
  sectionInfo: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  };
  student: {
    id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    status: string;
    profile: {
      lrn?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      phone?: string | null;
      address?: string | null;
      gradeLevel?: string | null;
      familyName?: string | null;
      familyRelationship?: string | null;
      familyContact?: string | null;
      profilePicture?: string | null;
    } | null;
  };
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
    roomNumber?: string | null;
    adviser: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    } | null;
  } | null;
}

export interface SectionCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gradeLevel?: string;
  profilePicture?: string;
  hasActiveSectionEnrollment?: boolean;
  enrolledSectionId?: string | null;
  enrolledSectionName?: string | null;
}

export const sectionService = {
  /** GET /sections/all — Admin, Teacher */
  async getAll(query?: SectionsQuery): Promise<SectionsListResponse> {
    const { data } = await api.get('/sections/all', { params: query });
    return data;
  },

  /** GET /sections/my — Admin, Teacher */
  async getMy(): Promise<{ success: boolean; data: Section[] }> {
    const { data } = await api.get('/sections/my');
    return data;
  },

  /** GET /sections/:id — Admin, Teacher */
  async getById(id: string): Promise<{ success: boolean; data: Section }> {
    const { data } = await api.get(`/sections/${id}`);
    return data;
  },

  /** POST /sections/create — Admin only */
  async create(dto: CreateSectionDto): Promise<{ success: boolean; message: string; data: Section }> {
    const { data } = await api.post('/sections/create', dto);
    return data;
  },

  /** PUT /sections/update/:id — Admin only */
  async update(id: string, dto: UpdateSectionDto): Promise<{ success: boolean; message: string; data: Section }> {
    const { data } = await api.put(`/sections/update/${id}`, dto);
    return data;
  },

  /** DELETE /sections/delete/:id — Admin only (soft) */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/sections/delete/${id}`);
    return data;
  },

  /** DELETE /sections/delete/:id — Admin only (archive alias) */
  async archive(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/sections/delete/${id}`);
    return data;
  },

  /** PUT /sections/:id/restore — Admin only */
  async restore(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.put(`/sections/${id}/restore`);
    return data;
  },

  /** DELETE /sections/permanent/:id — Admin only (hard) */
  async permanentDelete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/sections/permanent/${id}`);
    return data;
  },

  /** GET /sections/:id/roster — Admin, Teacher */
  async getRoster(id: string): Promise<{ success: boolean; data: RosterStudent[]; count: number }> {
    const { data } = await api.get(`/sections/${id}/roster`);
    return data;
  },

  /** GET /sections/:id/candidates — Admin, Teacher */
  async getCandidates(id: string, query?: { gradeLevel?: string; search?: string }): Promise<{ success: boolean; data: SectionCandidate[]; count: number }> {
    const { data } = await api.get(`/sections/${id}/candidates`, { params: query });
    return data;
  },

  /** POST /sections/:id/roster — Admin, Teacher (bulk add students) */
  async addStudents(id: string, studentIds: string[]): Promise<{ success: boolean; message: string; data: { createdCount: number } }> {
    const { data } = await api.post(`/sections/${id}/roster`, { studentIds });
    return data;
  },

  /** DELETE /sections/:id/roster/:studentId — Admin, Teacher */
  async removeStudent(sectionId: string, studentId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.delete(`/sections/${sectionId}/roster/${studentId}`);
    return data;
  },

  /** GET /sections/:id/students/:studentId/profile — Admin, Teacher */
  async getStudentProfileForSection(
    sectionId: string,
    studentId: string,
  ): Promise<{ success: boolean; message: string; data: TeacherSectionStudentProfile }> {
    const { data } = await api.get(`/sections/${sectionId}/students/${studentId}/profile`);
    return data;
  },

  /** GET /sections/:id/schedule — All roles */
  async getSchedule(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/sections/${id}/schedule`);
    return data;
  },
};
