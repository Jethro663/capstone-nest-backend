import { api } from '@/lib/api-client';
import type { Section, CreateSectionDto, UpdateSectionDto } from '@/types/section';
import type { User } from '@/types/user';

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
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RosterStudent {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  lrn?: string;
  gradeLevel?: string;
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

  /** GET /sections/:id/candidates — Admin */
  async getCandidates(id: string, query?: { gradeLevel?: string; search?: string }): Promise<{ success: boolean; data: User[]; count: number }> {
    const { data } = await api.get(`/sections/${id}/candidates`, { params: query });
    return data;
  },

  /** POST /sections/:id/roster — Admin (bulk add students) */
  async addStudents(id: string, studentIds: string[]): Promise<{ success: boolean; message: string; data: { createdCount: number } }> {
    const { data } = await api.post(`/sections/${id}/roster`, { studentIds });
    return data;
  },

  /** DELETE /sections/:id/roster/:studentId — Admin */
  async removeStudent(sectionId: string, studentId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.delete(`/sections/${sectionId}/roster/${studentId}`);
    return data;
  },

  /** GET /sections/:id/schedule — All roles */
  async getSchedule(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/sections/${id}/schedule`);
    return data;
  },
};
