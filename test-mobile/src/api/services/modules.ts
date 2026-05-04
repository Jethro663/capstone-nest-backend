import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import { downloadProtectedFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type { ClassModule, ModuleItem, UpdateClassModuleDto, UpdateModuleItemDto } from "../../types/module";

export type ModuleDetail = ClassModule;

export const modulesApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule[]>>(`/modules/class/${classId}`);
    return normalizeArray<ClassModule>(unwrapEnvelope(response.data));
  },

  async getByClassAndModule(classId: string, moduleId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule>>(`/modules/class/${classId}/${moduleId}`);
    return unwrapEnvelope(response.data);
  },

  async update(moduleId: string, payload: UpdateClassModuleDto) {
    const response = await apiClient.patch<ApiEnvelope<ClassModule>>(`/modules/${moduleId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async updateItem(itemId: string, payload: UpdateModuleItemDto) {
    const response = await apiClient.patch<ApiEnvelope<ModuleItem>>(`/modules/items/${itemId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async downloadAttachedFile(itemId: string, fallbackName = "module-attachment") {
    return downloadProtectedFile({
      pathname: `/modules/items/${itemId}/file/download`,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },

  async openAttachedFile(itemId: string, fallbackName = "module-attachment") {
    return downloadProtectedFile({
      pathname: `/modules/items/${itemId}/file/download`,
      fallbackName,
      openAfterDownload: true,
    });
  },
};
