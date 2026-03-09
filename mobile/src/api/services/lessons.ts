import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { Lesson, LessonCompletion } from '@/types/lesson';

export const lessonsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Lesson[]>>(`/lessons/class/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getCompletedByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<LessonCompletion[]>>(`/lessons/class/${classId}/completed`);
    return unwrapEnvelope(response.data);
  },

  async getById(lessonId: string) {
    const response = await apiClient.get<ApiEnvelope<Lesson>>(`/lessons/${lessonId}`);
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
};
