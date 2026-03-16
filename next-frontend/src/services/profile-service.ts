import { api } from '@/lib/api-client';
import type { AcademicSummary, StudentProfile } from '@/types/profile';

export type GradeLevel = '7' | '8' | '9' | '10';

export interface UpdateProfileDto {
  gradeLevel?: GradeLevel;
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Sibling' | 'Other';
  familyContact?: string;
  profilePicture?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: StudentProfile;
}

export const profileService = {
  async getMine(): Promise<{ success: boolean; data: StudentProfile | null }> {
    const { data } = await api.get('/profiles/me');
    return data;
  },

  async getAcademicSummary(): Promise<{
    success: boolean;
    data: AcademicSummary;
  }> {
    const { data } = await api.get('/profiles/me/academic-summary');
    return data;
  },

  /** PUT /profiles/update/:userId — updates a student's profile fields */
  async update(userId: string, dto: UpdateProfileDto): Promise<UpdateProfileResponse> {
    const { data } = await api.put(`/profiles/update/${userId}`, dto);
    return data;
  },

  async uploadAvatar(file: File): Promise<{
    success: boolean;
    message: string;
    data: { profile: StudentProfile; profilePicture: string };
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const { data } = await api.post('/profiles/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  },
};
