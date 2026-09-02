import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import { downloadProtectedFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type {
  ClassModule,
  CreateClassModuleDto,
  CreateModuleSectionDto,
  ModuleItem,
  ModuleSection,
  ReplaceModuleGradingScaleDto,
  UpdateClassModuleDto,
  UpdateModuleItemDto,
  UpdateModuleSectionDto,
} from "../../types/module";

export type ModuleDetail = ClassModule;

export const modulesApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule[]>>(`/modules/class/${classId}`);
    return normalizeArray<ClassModule>(unwrapEnvelope(response.data));
  },

  async create(payload: CreateClassModuleDto) {
    const response = await apiClient.post<ApiEnvelope<ClassModule>>("/modules", payload);
    return unwrapEnvelope(response.data);
  },

  async getByClassAndModule(classId: string, moduleId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassModule>>(`/modules/class/${classId}/${moduleId}`);
    return unwrapEnvelope(response.data);
  },

  async update(moduleId: string, payload: UpdateClassModuleDto) {
    const response = await apiClient.patch<ApiEnvelope<ClassModule>>(`/modules/${moduleId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async releaseCoreModule(moduleId: string, payload: { isVisible?: boolean; isLocked?: boolean }) {
    const response = await apiClient.patch<ApiEnvelope<ClassModule>>(`/modules/${moduleId}/core-release`, payload);
    return unwrapEnvelope(response.data);
  },

  async updateItem(itemId: string, payload: UpdateModuleItemDto) {
    const response = await apiClient.patch<ApiEnvelope<ModuleItem>>(`/modules/items/${itemId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async releaseCoreItem(itemId: string, payload: { isVisible?: boolean; isGiven?: boolean }) {
    const response = await apiClient.patch<ApiEnvelope<ModuleItem>>(`/modules/items/${itemId}/core-release`, payload);
    return unwrapEnvelope(response.data);
  },

  async delete(moduleId: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/modules/${moduleId}`);
    return unwrapEnvelope(response.data);
  },

  async createSection(moduleId: string, payload: CreateModuleSectionDto) {
    const response = await apiClient.post<ApiEnvelope<ModuleSection>>(`/modules/${moduleId}/sections`, payload);
    return unwrapEnvelope(response.data);
  },

  async updateSection(sectionId: string, payload: UpdateModuleSectionDto) {
    const response = await apiClient.patch<ApiEnvelope<ModuleSection>>(`/modules/sections/${sectionId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async deleteSection(sectionId: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/modules/sections/${sectionId}`);
    return unwrapEnvelope(response.data);
  },

  async detachItem(itemId: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/modules/items/${itemId}`);
    return unwrapEnvelope(response.data);
  },

  async reorderModules(classId: string, moduleIds: string[]) {
    const modulesPayload = moduleIds.map((id, index) => ({ id, order: index + 1 }));
    const response = await apiClient.put<ApiEnvelope<ClassModule[]>>(`/modules/class/${classId}/reorder`, {
      modules: modulesPayload,
    });
    return normalizeArray<ClassModule>(unwrapEnvelope(response.data));
  },

  async reorderSections(moduleId: string, sectionIds: string[]) {
    const sectionsPayload = sectionIds.map((id, index) => ({ id, order: index + 1 }));
    const response = await apiClient.put<ApiEnvelope<ModuleSection[]>>(`/modules/${moduleId}/sections/reorder`, {
      sections: sectionsPayload,
    });
    return normalizeArray<ModuleSection>(unwrapEnvelope(response.data));
  },

  async reorderItems(sectionId: string, itemIds: string[]) {
    const itemsPayload = itemIds.map((id, index) => ({ id, order: index + 1 }));
    const response = await apiClient.put<ApiEnvelope<ModuleItem[]>>(`/modules/sections/${sectionId}/items/reorder`, {
      items: itemsPayload,
    });
    return normalizeArray<ModuleItem>(unwrapEnvelope(response.data));
  },

  async attachItem(sectionId: string, payload: { itemType: string; lessonId?: string; assessmentId?: string; fileId?: string; isVisible?: boolean }) {
    const response = await apiClient.post<ApiEnvelope<ModuleItem>>(`/modules/sections/${sectionId}/items`, payload);
    return unwrapEnvelope(response.data);
  },

  async uploadCover(moduleId: string, file: { uri: string; name?: string; type?: string }) {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name || "cover.jpg",
      type: file.type || "image/jpeg",
    } as any);
    const response = await apiClient.post<ApiEnvelope<{ coverImageUrl: string; module: ClassModule }>>(`/modules/${moduleId}/cover`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrapEnvelope(response.data);
  },

  async replaceGradingScale(moduleId: string, payload: ReplaceModuleGradingScaleDto) {
    const response = await apiClient.put<ApiEnvelope<Array<Record<string, unknown>>>>(`/modules/${moduleId}/grading-scale`, payload);
    return normalizeArray<Record<string, unknown>>(unwrapEnvelope(response.data));
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
