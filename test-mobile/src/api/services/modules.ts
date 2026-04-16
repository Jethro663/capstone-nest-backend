import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { ClassModule } from "../../types/module";

export const modulesApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule[]>>(`/modules/class/${classId}`);
    return normalizeArray<ClassModule>(unwrapEnvelope(response.data));
  },

  async getByClassAndModule(classId: string, moduleId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule>>(`/modules/class/${classId}/${moduleId}`);
    return unwrapEnvelope(response.data);
  },
};
