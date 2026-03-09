import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { StudentProfile, UpdateProfileDto } from '@/types/profile';

export const profileApi = {
  async getMine() {
    const response = await apiClient.get<ApiEnvelope<StudentProfile | null>>('/profiles/me');
    return unwrapEnvelope(response.data);
  },

  async updateByUserId(userId: string, payload: UpdateProfileDto) {
    const response = await apiClient.put<ApiEnvelope<StudentProfile>>(`/profiles/update/${userId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async uploadAvatar(file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    formData.append('image', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as never);

    const response = await apiClient.post<
      ApiEnvelope<{ profile: StudentProfile; profilePicture: string }>
    >('/profiles/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapEnvelope(response.data);
  },
};
