import { api } from '@/lib/api-client';
import type {
  ClassItem,
  CreateClassDto,
  UpdateClassDto,
  Enrollment,
  EnrollStudentDto,
  StudentMasterlistItem,
  StudentMasterlistQuery,
  TeacherClassStudentProfile,
} from '@/types/class';
import type { User } from '@/types/user';

export interface ClassesQuery {
  subjectId?: string;
  sectionId?: string;
  teacherId?: string;
  schoolYear?: string;
  isActive?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const classService = {
  /** GET /classes/all — Admin, Teacher */
  async getAll(query?: ClassesQuery): Promise<{ success: boolean; message: string; data: { data: ClassItem[]; total: number; page: number; limit: number } }> {
    const { data } = await api.get('/classes/all', { params: query });
    return data;
  },

  /** GET /classes/teacher/:teacherId — Admin, Teacher */
  async getByTeacher(teacherId: string): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/teacher/${teacherId}`);
    return data;
  },

  /** GET /classes/section/:sectionId — Admin, Teacher */
  async getBySection(sectionId: string): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/section/${sectionId}`);
    return data;
  },

  /** GET /classes/subject/:subjectCode — Admin, Teacher */
  async getBySubject(subjectCode: string): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/subject/${subjectCode}`);
    return data;
  },

  /** GET /classes/student/:studentId — All roles */
  async getByStudent(studentId: string): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/student/${studentId}`);
    return data;
  },

  /** GET /classes/:id — All roles */
  async getById(id: string): Promise<{ success: boolean; message: string; data: ClassItem }> {
    const { data } = await api.get(`/classes/${id}`);
    return data;
  },

  /** POST /classes — Admin only */
  async create(dto: CreateClassDto): Promise<{ success: boolean; message: string; data: ClassItem }> {
    const { data } = await api.post('/classes', dto);
    return data;
  },

  /** PUT /classes/:id — Admin only */
  async update(id: string, dto: UpdateClassDto): Promise<{ success: boolean; message: string; data: ClassItem }> {
    const { data } = await api.put(`/classes/${id}`, dto);
    return data;
  },

  /** PUT /classes/:id/toggle-status — Admin only */
  async toggleStatus(id: string): Promise<{ success: boolean; message: string; data: ClassItem }> {
    const { data } = await api.put(`/classes/${id}/toggle-status`);
    return data;
  },

  /** DELETE /classes/:id — Admin only (204) */
  async delete(id: string): Promise<void> {
    await api.delete(`/classes/${id}`);
  },

  /** DELETE /classes/:id/purge — Admin only */
  async purge(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/classes/${id}/purge`);
    return data;
  },

  /** GET /classes/:classId/enrollments — Admin, Teacher */
  async getEnrollments(classId: string): Promise<{ success: boolean; message: string; data: Enrollment[]; count: number }> {
    const { data } = await api.get(`/classes/${classId}/enrollments`);
    return data;
  },

  /** GET /classes/:classId/candidates — Admin, Teacher */
  async getCandidates(classId: string): Promise<{ success: boolean; message: string; data: User[]; count: number }> {
    const { data } = await api.get(`/classes/${classId}/candidates`);
    return data;
  },

  /** GET /classes/:classId/students/masterlist — Admin, Teacher */
  async getStudentsMasterlist(
    classId: string,
    query?: StudentMasterlistQuery,
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentMasterlistItem[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    classContext: {
      classId: string;
      sectionId: string;
      classGradeLevel?: string;
    };
  }> {
    const { data } = await api.get(`/classes/${classId}/students/masterlist`, {
      params: query,
    });
    return data;
  },

  /** GET /classes/:classId/students/:studentId/profile — Admin, Teacher */
  async getStudentProfileForClass(
    classId: string,
    studentId: string,
  ): Promise<{ success: boolean; message: string; data: TeacherClassStudentProfile }> {
    const { data } = await api.get(
      `/classes/${classId}/students/${studentId}/profile`,
    );
    return data;
  },

  /** POST /classes/:classId/enrollments — Admin, Teacher */
  async enrollStudent(classId: string, dto: EnrollStudentDto): Promise<{ success: boolean; message: string; data: Enrollment }> {
    const { data } = await api.post(`/classes/${classId}/enrollments`, dto);
    return data;
  },

  /** DELETE /classes/:classId/enrollments/:studentId — Admin, Teacher */
  async unenrollStudent(classId: string, studentId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/classes/${classId}/enrollments/${studentId}`);
    return data;
  },
};
