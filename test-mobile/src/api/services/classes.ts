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
} from "../../types/class";

export const classesApi = {
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
    const response = await apiClient.get<ApiEnvelope<StudentMasterlistItem[]>>(
      `/classes/${classId}/students/masterlist`,
      { params: query },
    );
    return normalizeArray<StudentMasterlistItem>(unwrapEnvelope(response.data));
  },

  async enrollStudent(classId: string, dto: EnrollStudentDto) {
    const response = await apiClient.post<ApiEnvelope<EnrollmentRecord>>(`/classes/${classId}/enrollments`, dto);
    return unwrapEnvelope(response.data);
  },
};
