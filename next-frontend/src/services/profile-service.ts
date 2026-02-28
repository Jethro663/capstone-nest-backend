import { api } from '@/lib/api-client';

export type GradeLevel = '7' | '8' | '9' | '10';

export interface UpdateProfileDto {
  gradeLevel?: GradeLevel;
  lrn?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Sibling' | 'Other';
  familyContact?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export const profileService = {
  /** PUT /profiles/update/:userId — updates a student's profile fields */
  async update(userId: string, dto: UpdateProfileDto): Promise<UpdateProfileResponse> {
    const { data } = await api.put(`/profiles/update/${userId}`, dto);
    return data;
  },
};
