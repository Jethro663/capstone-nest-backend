import type { StudentProfile, TeacherProfile } from './profile';

export interface User {
  id: string;
  userId?: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  roles: string[];
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Merged profile fields
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  gender?: string;
  phone?: string;
  address?: string;
  gradeLevel?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  profile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
  [key: string]: unknown;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  lrn?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: string;
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  gradeLevel?: string;
  profilePicture?: string;
}
