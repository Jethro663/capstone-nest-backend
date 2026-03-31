import { api } from '@/lib/api-client';
import type {
  ClassItem,
  ClassVisibilityStatus,
  CreateClassDto,
  UpdateClassDto,
  Enrollment,
  EnrollStudentDto,
  StudentMasterlistItem,
  StudentMasterlistQuery,
  StudentClassPresentationPreference,
  StudentClassPresentationMode,
  StudentCourseViewMode,
  TeacherClassStudentProfile,
  TeacherClassStudentOverview,
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

export type BulkClassLifecycleAction = 'archive' | 'restore' | 'purge';

export interface BulkClassLifecycleDto {
  action: BulkClassLifecycleAction;
  classIds: string[];
}

export interface BulkClassLifecycleResponse {
  success: boolean;
  message: string;
  data: {
    action: BulkClassLifecycleAction;
    requested: number;
    succeeded: string[];
    failed: Array<{
      classId: string;
      reason: string;
    }>;
  };
}

export const classService = {
  /** GET /classes/all — Admin, Teacher */
  async getAll(query?: ClassesQuery): Promise<{ success: boolean; message: string; data: { data: ClassItem[]; total: number; page: number; limit: number } }> {
    const { data } = await api.get('/classes/all', { params: query });
    return data;
  },

  /** GET /classes/teacher/:teacherId — Admin, Teacher */
  async getByTeacher(
    teacherId: string,
    status: ClassVisibilityStatus = 'all',
  ): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/teacher/${teacherId}`, {
      params: { status },
    });
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
  async getByStudent(
    studentId: string,
    status: ClassVisibilityStatus = 'all',
  ): Promise<{ success: boolean; message: string; data: ClassItem[] }> {
    const { data } = await api.get(`/classes/student/${studentId}`, {
      params: { status },
    });
    return data;
  },

  async getStudentPresentationPreferences(
    studentId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentClassPresentationPreference[];
  }> {
    const { data } = await api.get(
      `/classes/student/${studentId}/preferences/presentation`,
    );
    return data;
  },

  async updateStudentPresentation(
    classId: string,
    dto: { styleMode: StudentClassPresentationMode; styleToken: string },
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentClassPresentationPreference;
  }> {
    const { data } = await api.put(`/classes/${classId}/student-presentation`, dto);
    return data;
  },

  async getStudentCourseViewPreference(
    studentId: string,
  ): Promise<{ success: boolean; message: string; data: { viewMode: StudentCourseViewMode } }> {
    const { data } = await api.get(`/classes/student/${studentId}/preferences/view`);
    return data;
  },

  async setStudentCourseViewPreference(
    studentId: string,
    viewMode: StudentCourseViewMode,
  ): Promise<{ success: boolean; message: string; data: { viewMode: StudentCourseViewMode } }> {
    const { data } = await api.put(`/classes/student/${studentId}/preferences/view`, { viewMode });
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

  /** PATCH /classes/:id/presentation â€” Teacher, Admin */
  async updatePresentation(
    id: string,
    dto: Pick<UpdateClassDto, 'cardPreset' | 'cardBannerUrl'>,
  ): Promise<{ success: boolean; message: string; data: ClassItem }> {
    const { data } = await api.patch(`/classes/${id}/presentation`, dto);
    return data;
  },

  /** POST /classes/:id/banner â€” Teacher, Admin */
  async uploadBanner(
    id: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      cardBannerUrl: string;
      class: ClassItem;
    };
  }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`/classes/${id}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  async bulkLifecycle(dto: BulkClassLifecycleDto): Promise<BulkClassLifecycleResponse> {
    const { data } = await api.post('/classes/bulk/lifecycle', dto);
    return data;
  },

  async hide(id: string): Promise<{ success: boolean; message: string; data: { classId: string; isHidden: boolean } }> {
    const { data } = await api.patch(`/classes/${id}/hide`);
    return data;
  },

  async unhide(id: string): Promise<{ success: boolean; message: string; data: { classId: string; isHidden: boolean } }> {
    const { data } = await api.patch(`/classes/${id}/unhide`);
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

  /** GET /classes/:classId/students/:studentId/overview — Admin, Teacher */
  async getStudentOverviewForClass(
    classId: string,
    studentId: string,
  ): Promise<{ success: boolean; message: string; data: TeacherClassStudentOverview }> {
    const { data } = await api.get(
      `/classes/${classId}/students/${studentId}/overview`,
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
