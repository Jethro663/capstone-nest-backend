import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { BulkLessonDraftStateDto, ContentBlock, ContentBlockType, Lesson, LessonCompletion } from "../../types/lesson";

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

  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Lesson[]>>(`/lessons/class/${classId}`);
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
