import { api } from '@/lib/api-client';
import type {
  Lesson,
  ContentBlock,
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
  ReorderLessonsDto,
  BulkLessonDraftStateDto,
  BulkLessonIdsDto,
  LessonCompletion,
  LessonsResponse,
  LessonListQuery,
} from '@/types/lesson';

export const lessonService = {
  /** GET /lessons/class/:classId — All roles */
  async getByClass(classId: string, query: LessonListQuery = {}): Promise<LessonsResponse> {
    const { data } = await api.get(`/lessons/class/${classId}`, {
      params: query,
    });
    return data;
  },

  /** GET /lessons/class/:classId/completed — Student */
  async getCompletedByClass(classId: string): Promise<{ success: boolean; data: LessonCompletion[]; count: number }> {
    const { data } = await api.get(`/lessons/class/${classId}/completed`);
    return data;
  },

  /** GET /lessons/:id — All roles */
  async getById(id: string): Promise<{ success: boolean; message: string; data: Lesson }> {
    const { data } = await api.get(`/lessons/${id}`);
    return data;
  },

  /** POST /lessons — Admin, Teacher */
  async create(dto: CreateLessonDto): Promise<{ success: boolean; message: string; data: Lesson }> {
    const { data } = await api.post('/lessons', dto);
    return data;
  },

  /** PUT /lessons/:id — Admin, Teacher */
  async update(id: string, dto: UpdateLessonDto): Promise<{ success: boolean; message: string; data: Lesson }> {
    const { data } = await api.put(`/lessons/${id}`, dto);
    return data;
  },

  /** PUT /lessons/:id/publish — Admin, Teacher */
  async publish(id: string): Promise<{ success: boolean; message: string; data: Lesson }> {
    const { data } = await api.put(`/lessons/${id}/publish`);
    return data;
  },

  /** PUT /lessons/class/:classId/bulk-status — Admin, Teacher */
  async bulkUpdateDraftState(
    classId: string,
    dto: BulkLessonDraftStateDto,
  ): Promise<{ success: boolean; message: string; data: Lesson[]; count: number }> {
    const { data } = await api.put(`/lessons/class/${classId}/bulk-status`, dto);
    return data;
  },

  /** POST /lessons/class/:classId/bulk-delete — Admin, Teacher */
  async bulkDelete(
    classId: string,
    dto: BulkLessonIdsDto,
  ): Promise<{ success: boolean; message: string; data: Lesson[]; count: number }> {
    const { data } = await api.post(`/lessons/class/${classId}/bulk-delete`, dto);
    return data;
  },

  /** PUT /lessons/class/:classId/reorder — Admin, Teacher */
  async reorderByClass(
    classId: string,
    dto: ReorderLessonsDto,
  ): Promise<{ success: boolean; message: string; data: Lesson[]; count: number }> {
    const { data } = await api.put(`/lessons/class/${classId}/reorder`, dto);
    return data;
  },

  /** DELETE /lessons/:id — Admin, Teacher (204) */
  async delete(id: string): Promise<void> {
    await api.delete(`/lessons/${id}`);
  },

  // --- Content Blocks ---

  /** POST /lessons/:lessonId/blocks — Admin, Teacher */
  async createBlock(lessonId: string, dto: CreateContentBlockDto): Promise<{ success: boolean; message: string; data: ContentBlock }> {
    const { data } = await api.post(`/lessons/${lessonId}/blocks`, dto);
    return data;
  },

  /** PUT /lessons/blocks/:blockId — Admin, Teacher */
  async updateBlock(blockId: string, dto: UpdateContentBlockDto): Promise<{ success: boolean; message: string; data: ContentBlock }> {
    const { data } = await api.put(`/lessons/blocks/${blockId}`, dto);
    return data;
  },

  /** DELETE /lessons/blocks/:blockId — Admin, Teacher (204) */
  async deleteBlock(blockId: string): Promise<void> {
    await api.delete(`/lessons/blocks/${blockId}`);
  },

  /** PUT /lessons/:lessonId/reorder-blocks — Admin, Teacher */
  async reorderBlocks(lessonId: string, dto: ReorderBlocksDto): Promise<{ success: boolean; message: string; data: Lesson }> {
    const { data } = await api.put(`/lessons/${lessonId}/reorder-blocks`, dto);
    return data;
  },

  // --- Lesson Completions ---

  /** POST /lessons/:lessonId/complete — Student */
  async complete(
    lessonId: string,
  ): Promise<{ success: boolean; message: string; data: { completed: boolean; completedAt?: string } }> {
    const { data } = await api.post(`/lessons/${lessonId}/complete`);
    return data;
  },

  /** GET /lessons/:lessonId/completion-status — Student */
  async getCompletionStatus(lessonId: string): Promise<{ success: boolean; data: { completed: boolean; completedAt?: string } }> {
    const { data } = await api.get(`/lessons/${lessonId}/completion-status`);
    return data;
  },
};
