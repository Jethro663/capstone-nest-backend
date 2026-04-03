import { api } from '@/lib/api-client';
import type {
  AttachModuleItemDto,
  ClassModule,
  CreateClassModuleDto,
  CreateModuleSectionDto,
  ReplaceModuleGradingScaleDto,
  UpdateClassModuleDto,
  UpdateModuleItemDto,
  UpdateModuleSectionDto,
} from '@/types/module';

export const moduleService = {
  async getByClass(
    classId: string,
  ): Promise<{ success: boolean; message: string; data: ClassModule[]; count: number }> {
    const { data } = await api.get(`/modules/class/${classId}`);
    return data;
  },

  async getByClassAndModule(
    classId: string,
    moduleId: string,
  ): Promise<{ success: boolean; message: string; data: ClassModule }> {
    const { data } = await api.get(`/modules/class/${classId}/${moduleId}`);
    return data;
  },

  async create(
    dto: CreateClassModuleDto,
  ): Promise<{ success: boolean; message: string; data: ClassModule }> {
    const { data } = await api.post('/modules', dto);
    return data;
  },

  async update(
    moduleId: string,
    dto: UpdateClassModuleDto,
  ): Promise<{ success: boolean; message: string; data: ClassModule }> {
    const { data } = await api.patch(`/modules/${moduleId}`, dto);
    return data;
  },

  async delete(
    moduleId: string,
  ): Promise<{ success: boolean; message: string; data: ClassModule }> {
    const { data } = await api.delete(`/modules/${moduleId}`);
    return data;
  },

  async reorderByClass(
    classId: string,
    modules: Array<{ id: string; order: number }>,
  ): Promise<{ success: boolean; message: string; data: ClassModule[]; count: number }> {
    const { data } = await api.put(`/modules/class/${classId}/reorder`, {
      modules,
    });
    return data;
  },

  async createSection(
    moduleId: string,
    dto: CreateModuleSectionDto,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.post(`/modules/${moduleId}/sections`, dto);
    return data;
  },

  async updateSection(
    sectionId: string,
    dto: UpdateModuleSectionDto,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.patch(`/modules/sections/${sectionId}`, dto);
    return data;
  },

  async deleteSection(
    sectionId: string,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.delete(`/modules/sections/${sectionId}`);
    return data;
  },

  async reorderSections(
    moduleId: string,
    sections: Array<{ id: string; order: number }>,
  ): Promise<{ success: boolean; message: string; data: unknown[]; count: number }> {
    const { data } = await api.put(`/modules/${moduleId}/sections/reorder`, {
      sections,
    });
    return data;
  },

  async attachItem(
    sectionId: string,
    dto: AttachModuleItemDto,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.post(`/modules/sections/${sectionId}/items`, dto);
    return data;
  },

  async updateItem(
    itemId: string,
    dto: UpdateModuleItemDto,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.patch(`/modules/items/${itemId}`, dto);
    return data;
  },

  async detachItem(
    itemId: string,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.delete(`/modules/items/${itemId}`);
    return data;
  },

  async reorderItems(
    sectionId: string,
    items: Array<{ id: string; order: number }>,
  ): Promise<{ success: boolean; message: string; data: unknown[]; count: number }> {
    const { data } = await api.put(`/modules/sections/${sectionId}/items/reorder`, {
      items,
    });
    return data;
  },

  async replaceGradingScale(
    moduleId: string,
    dto: ReplaceModuleGradingScaleDto,
  ): Promise<{ success: boolean; message: string; data: unknown[]; count: number }> {
    const { data } = await api.put(`/modules/${moduleId}/grading-scale`, dto);
    return data;
  },

  async uploadCover(
    moduleId: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      coverImageUrl: string;
      module: ClassModule;
    };
  }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`/modules/${moduleId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
