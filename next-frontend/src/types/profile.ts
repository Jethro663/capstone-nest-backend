export interface StudentProfile {
  id: string;
  userId: string;
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  gradeLevel?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileDto {
  lrn?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  gradeLevel?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}
