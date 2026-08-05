import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  ClassItem,
  ClassVisibilityStatus,
  EnrollmentRecord,
  EnrollStudentDto,
  StudentMasterlistItem,
  StudentMasterlistQuery,
  StudentMasterlistResponse,
  TeacherClassStudentOverview,
  TeacherClassStudentProfile,
} from "../../types/class";

export const classesApi = {
  async getAll(query?: {
    isActive?: boolean;
    schoolYear?: string;
    subjectGradeLevel?: string;
    search?: string;
    limit?: number;
  }) {
    const response = await apiClient.get<ApiEnvelope<{ data: ClassItem[] }>>("/classes/all", {
      params: query,
    });
    const payload = unwrapEnvelope(response.data);
    return normalizeArray<ClassItem>(payload?.data);
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
