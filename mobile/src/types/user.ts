import type { StudentProfile, TeacherProfile } from "./profile";

export type UserRole = string | { id?: string; name?: string };

export interface User {
  id: string;
  userId?: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  roles: UserRole[];
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED";
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  gender?: string;
  phone?: string;
  address?: string;
  gradeLevel?: string;
  graduatedAt?: string | null;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  contactNumber?: string;
  department?: string;
  specialization?: string;
  employeeId?: string;
  profile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
}
