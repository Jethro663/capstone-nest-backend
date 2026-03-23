import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { ClassItem } from "../../types/class";

export const classesApi = {
  async getStudentClasses(studentId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassItem[]>>(`/classes/student/${studentId}`);
    return unwrapEnvelope(response.data);
  },

  async getById(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassItem>>(`/classes/${classId}`);
    return unwrapEnvelope(response.data);
  },
};
