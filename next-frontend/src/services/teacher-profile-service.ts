import { api } from '@/lib/api-client';
import type { TeacherProfile } from '@/types/profile';

export interface UpdateTeacherProfileDto {
  department?: string;
  specialization?: string;
  profilePicture?: string;
  contactNumber?: string;
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
};
