import { api } from '@/lib/api-client';
import type { TeacherProfile } from '@/types/profile';

export interface UpdateTeacherProfileDto {
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  department?: string;
  specialization?: string;
  profilePicture?: string;
  contactNumber?: string;
  address?: string;
  employeeId?: string;
}

export const teacherProfileService = {
  async getMine(): Promise<{ success: boolean; data: TeacherProfile | null }> {
    const { data } = await api.get('/teacher-profiles/me');
    return data;
  },

  async getByUserId(userId: string): Promise<{ success: boolean; data: TeacherProfile | null }> {
    const { data } = await api.get(`/teacher-profiles/${userId}`);
    return data;
  },

  async update(
    userId: string,
    dto: UpdateTeacherProfileDto,
  ): Promise<{ success: boolean; message: string; data: TeacherProfile }> {
    const { data } = await api.put(`/teacher-profiles/${userId}`, dto);
    return data;
  },

  async uploadAvatar(file: File): Promise<{
    success: boolean;
    message: string;
    data: { profile: TeacherProfile; profilePicture: string };
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const { data } = await api.post('/teacher-profiles/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  },
};
