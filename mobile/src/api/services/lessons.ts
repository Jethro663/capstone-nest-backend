import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { BulkLessonDraftStateDto, BulkLessonIdsDto, ContentBlock, ContentBlockType, Lesson, LessonCompletion, LessonListQuery, LessonVersion, ReorderLessonsDto } from "../../types/lesson";

export type LessonDetail = Lesson;
export type LessonCompletionStatus = {
  completed: boolean;
  completedAt?: string;
};

export const lessonsApi = {
  async create(payload: { title: string; classId: string; description?: string }) {
    const response = await apiClient.post<ApiEnvelope<Lesson>>("/lessons", payload);
    return unwrapEnvelope(response.data);
  },

  async getByClass(classId: string, query: LessonListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<Lesson[]>>(`/lessons/class/${classId}`, { params: query });
    return normalizeArray<Lesson>(unwrapEnvelope(response.data));
  },

  async getCompletedByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<LessonCompletion[]>>(`/lessons/class/${classId}/completed`);
    return normalizeArray<LessonCompletion>(unwrapEnvelope(response.data));
  },

  async getById(lessonId: string) {
    const response = await apiClient.get<ApiEnvelope<Lesson>>(`/lessons/${lessonId}`);
    return unwrapEnvelope(response.data);
  },

  async update(lessonId: string, payload: { title?: string; description?: string; order?: number }) {
    const response = await apiClient.put<ApiEnvelope<Lesson>>(`/lessons/${lessonId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async complete(lessonId: string) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(`/lessons/${lessonId}/complete`, {});
    return unwrapEnvelope(response.data);
  },

  async getCompletionStatus(lessonId: string) {
    const response = await apiClient.get<ApiEnvelope<{ completed: boolean; completedAt?: string }>>(
      `/lessons/${lessonId}/completion-status`,
    );
    return unwrapEnvelope(response.data);
  },

  async publish(lessonId: string) {
    const response = await apiClient.put<ApiEnvelope<Lesson>>(`/lessons/${lessonId}/publish`);
    return unwrapEnvelope(response.data);
  },

  async getRecent(limit = 4) {
    const response = await apiClient.get<ApiEnvelope<Lesson[]>>("/lessons/student/recent", { params: { limit } });
    return normalizeArray<Lesson>(unwrapEnvelope(response.data));
  },

  async getVersions(lessonId: string) {
    const response = await apiClient.get<ApiEnvelope<LessonVersion[]>>(`/lessons/${lessonId}/versions`);
    return normalizeArray<LessonVersion>(unwrapEnvelope(response.data));
  },

  async createVersion(lessonId: string, payload: { label?: string } = {}) {
    const response = await apiClient.post<ApiEnvelope<LessonVersion[]>>(`/lessons/${lessonId}/versions`, payload);
    return normalizeArray<LessonVersion>(unwrapEnvelope(response.data));
  },

  async restoreVersion(lessonId: string, versionId: string) {
    const response = await apiClient.post<ApiEnvelope<Lesson>>(`/lessons/${lessonId}/versions/${versionId}/restore`, {});
    return unwrapEnvelope(response.data);
  },

  async bulkDelete(classId: string, payload: BulkLessonIdsDto) {
    const response = await apiClient.post<ApiEnvelope<Lesson[]>>(`/lessons/class/${classId}/bulk-delete`, payload);
    return normalizeArray<Lesson>(unwrapEnvelope(response.data));
  },

  async reorderByClass(classId: string, payload: ReorderLessonsDto) {
    const response = await apiClient.put<ApiEnvelope<Lesson[]>>(`/lessons/class/${classId}/reorder`, payload);
    return normalizeArray<Lesson>(unwrapEnvelope(response.data));
  },

  async delete(lessonId: string) {
    await apiClient.delete(`/lessons/${lessonId}`);
  },

  async setDraftState(classId: string, payload: BulkLessonDraftStateDto) {
    const response = await apiClient.put<ApiEnvelope<Lesson[]>>(
      `/lessons/class/${classId}/bulk-status`,
      payload,
    );
    return normalizeArray<Lesson>(unwrapEnvelope(response.data));
  },

  async createBlock(
    lessonId: string,
    payload: { type: ContentBlockType; content?: string | Record<string, unknown>; order?: number; metadata?: Record<string, unknown> },
  ) {
    const response = await apiClient.post<ApiEnvelope<ContentBlock>>(`/lessons/${lessonId}/blocks`, payload);
    return unwrapEnvelope(response.data);
  },

  async updateBlock(
    blockId: string,
    payload: { type?: ContentBlockType; content?: string | Record<string, unknown>; order?: number; metadata?: Record<string, unknown> },
  ) {
    const response = await apiClient.put<ApiEnvelope<ContentBlock>>(`/lessons/blocks/${blockId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async deleteBlock(blockId: string) {
    await apiClient.delete(`/lessons/blocks/${blockId}`);
  },

  async reorderBlocks(lessonId: string, payload: { blocks: Array<{ id: string; order: number }> }) {
    const response = await apiClient.put<ApiEnvelope<Lesson>>(`/lessons/${lessonId}/reorder-blocks`, payload);
    return unwrapEnvelope(response.data);
  },
};
