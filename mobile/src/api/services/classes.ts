import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  ClassItem,
  CreateClassDto,
  ClassVisibilityStatus,
  EnrollmentRecord,
  EnrollStudentDto,
  StudentMasterlistItem,
  StudentMasterlistQuery,
  StudentMasterlistResponse,
  TeacherClassStudentOverview,
  TeacherClassStudentProfile,
  UpdateClassDto,
} from "../../types/class";
import { fetchAllPages, normalizePageEnvelope, type PageEnvelope } from "../pagination";

export type ClassesListQuery = {
  isActive?: boolean;
  schoolYear?: string;
  subjectGradeLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const classesApi = {
  async create(payload: CreateClassDto) {
    const response = await apiClient.post<ApiEnvelope<ClassItem>>("/classes", payload);
    return unwrapEnvelope(response.data);
  },

  async update(classId: string, payload: UpdateClassDto) {
    const response = await apiClient.put<ApiEnvelope<ClassItem>>(`/classes/${classId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async toggleStatus(classId: string) {
    const response = await apiClient.put<ApiEnvelope<ClassItem>>(`/classes/${classId}/toggle-status`);
    return unwrapEnvelope(response.data);
  },

  async remove(classId: string) {
    await apiClient.delete(`/classes/${classId}`);
  },

  async getPage(query: ClassesListQuery = {}): Promise<PageEnvelope<ClassItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const response = await apiClient.get<ApiEnvelope<{ data: ClassItem[]; total?: number; page?: number; limit?: number }>>(
      "/classes/all",
      {
        params: { ...query, page, limit },
      },
    );
    return normalizePageEnvelope(unwrapEnvelope(response.data), page, limit);
  },

  async getAll(query: Omit<ClassesListQuery, "page"> = {}) {
    const result = await fetchAllPages(
      (page, limit) => classesApi.getPage({ ...query, page, limit }),
      { limit: query.limit ?? 100, key: (item) => item.id },
    );
    return result.data;
  },

  async getStudentClasses(studentId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassItem[]>>(`/classes/student/${studentId}`);
    return normalizeArray<ClassItem>(unwrapEnvelope(response.data));
  },

  async getTeacherClasses(teacherId: string, status: ClassVisibilityStatus = "active") {
    const response = await apiClient.get<ApiEnvelope<ClassItem[]>>(`/classes/teacher/${teacherId}`, {
      params: { status },
    });
    return normalizeArray<ClassItem>(unwrapEnvelope(response.data));
  },

  async getById(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassItem>>(`/classes/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getEnrollments(classId: string) {
    const response = await apiClient.get<ApiEnvelope<EnrollmentRecord[]>>(`/classes/${classId}/enrollments`);
    return normalizeArray<EnrollmentRecord>(unwrapEnvelope(response.data));
  },

  async getStudentsMasterlist(classId: string, query?: StudentMasterlistQuery) {
    const response = await apiClient.get<ApiEnvelope<StudentMasterlistItem[]> | StudentMasterlistResponse>(
      `/classes/${classId}/students/masterlist`,
      { params: query },
    );
    const payload = response.data as StudentMasterlistResponse;
    return {
      data: normalizeArray<StudentMasterlistItem>(unwrapEnvelope(response.data as ApiEnvelope<StudentMasterlistItem[]>)),
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      totalPages: payload.totalPages,
      classContext: payload.classContext,
    };
  },

  async getStudentProfileForClass(classId: string, studentId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherClassStudentProfile>>(
      `/classes/${classId}/students/${studentId}/profile`,
    );
    return unwrapEnvelope(response.data);
  },

  async getStudentOverviewForClass(classId: string, studentId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherClassStudentOverview>>(
      `/classes/${classId}/students/${studentId}/overview`,
    );
    return unwrapEnvelope(response.data);
  },

  async enrollStudent(classId: string, dto: EnrollStudentDto) {
    const response = await apiClient.post<ApiEnvelope<EnrollmentRecord>>(`/classes/${classId}/enrollments`, dto);
    return unwrapEnvelope(response.data);
  },

  async unenrollStudent(classId: string, studentId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id?: string }>>(
      `/classes/${classId}/enrollments/${studentId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async updatePresentation(classId: string, dto: { cardPreset?: string | null; cardBannerUrl?: string | null }) {
    const response = await apiClient.patch<ApiEnvelope<ClassItem>>(`/classes/${classId}/presentation`, dto);
    return unwrapEnvelope(response.data);
  },

  async uploadBanner(classId: string, imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'banner.jpg';
    
    // Determine MIME type based on extension
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append("image", {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post<ApiEnvelope<ClassItem>>(
      `/classes/${classId}/banner`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return unwrapEnvelope(response.data);
  },
};
