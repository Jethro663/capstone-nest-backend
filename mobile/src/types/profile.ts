export interface StudentProfile {
  id: string;
  userId: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  dob?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  gender?: string;
  phone?: string;
  contactNumber?: string;
  address?: string;
  department?: string;
  specialization?: string;
  employeeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileDto {
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
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

export interface UpdateTeacherProfileDto {
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  contactNumber?: string;
  address?: string;
  department?: string;
  specialization?: string;
  employeeId?: string;
  profilePicture?: string;
}
