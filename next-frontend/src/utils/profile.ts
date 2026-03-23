import type { StudentProfile, TeacherProfile } from '@/types/profile';
import type { User } from '@/types/user';

export const STUDENT_REQUIRED_PROFILE_FIELDS = [
  'dateOfBirth',
  'gender',
  'phone',
  'address',
  'familyName',
  'familyRelationship',
  'familyContact',
] as const;

export const STUDENT_FIELD_LABELS: Record<(typeof STUDENT_REQUIRED_PROFILE_FIELDS)[number], string> = {
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  phone: 'Contact Number',
  address: 'Home Address',
  familyName: 'Guardian Name',
  familyRelationship: 'Guardian Relationship',
  familyContact: 'Guardian Contact Number',
};

export const TEACHER_REQUIRED_PROFILE_FIELDS = [
  'dateOfBirth',
  'gender',
  'phone',
  'address',
  'department',
  'specialization',
  'employeeId',
] as const;

export const TEACHER_FIELD_LABELS: Record<(typeof TEACHER_REQUIRED_PROFILE_FIELDS)[number], string> = {
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  phone: 'Contact Number',
  address: 'Home Address',
  department: 'Department',
  specialization: 'Specialization',
  employeeId: 'Employee ID',
};

export function getProfileRoute(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin/profile';
    case 'teacher':
      return '/dashboard/teacher/profile';
    default:
      return '/dashboard/student/profile';
  }
}

export function normalizeStudentProfile(
  profile: Partial<StudentProfile> | null | undefined,
): StudentProfile | null {
  if (!profile) return null;

  return {
    id: profile.id ?? profile.userId ?? '',
    userId: profile.userId ?? '',
    lrn: profile.lrn,
    dob: profile.dateOfBirth ?? profile.dob,
    dateOfBirth: profile.dateOfBirth ?? profile.dob,
    gender: profile.gender ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    gradeLevel: profile.gradeLevel ?? '',
    familyName: profile.familyName ?? '',
    familyRelationship: profile.familyRelationship ?? '',
    familyContact: profile.familyContact ?? '',
    profilePicture: profile.profilePicture ?? '',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function mergeUserWithStudentProfile(
  user: User | null,
  profile: StudentProfile | null,
): User | null {
  if (!user) return null;
  if (!profile) return user;

  return {
    ...user,
    ...profile,
    dob: profile.dateOfBirth ?? user.dob,
    dateOfBirth: profile.dateOfBirth ?? user.dateOfBirth,
    profilePicture: profile.profilePicture ?? user.profilePicture,
  };
}

export function normalizeTeacherProfile(
  profile: Partial<TeacherProfile> | null | undefined,
): TeacherProfile | null {
  if (!profile) return null;

  return {
    userId: profile.userId ?? '',
    dob: profile.dateOfBirth ?? profile.dob,
    dateOfBirth: profile.dateOfBirth ?? profile.dob,
    gender: profile.gender ?? '',
    phone: profile.phone ?? profile.contactNumber ?? '',
    contactNumber: profile.contactNumber ?? profile.phone ?? '',
    address: profile.address ?? '',
    department: profile.department ?? '',
    specialization: profile.specialization ?? '',
    employeeId: profile.employeeId ?? '',
    profilePicture: profile.profilePicture ?? '',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function mergeUserWithTeacherProfile(
  user: User | null,
  profile: TeacherProfile | null,
): User | null {
  if (!user) return null;
  if (!profile) return user;

  return {
    ...user,
    ...profile,
    dob: profile.dateOfBirth ?? user.dob,
    dateOfBirth: profile.dateOfBirth ?? user.dateOfBirth,
    phone: profile.phone ?? profile.contactNumber ?? user.phone,
    contactNumber: profile.contactNumber ?? profile.phone ?? user.contactNumber,
    profilePicture: profile.profilePicture ?? user.profilePicture,
  };
}

export function normalizePhilippinePhone(value: string): string | null {
  const trimmed = value.trim();

  if (/^09\d{9}$/.test(trimmed)) {
    return `+63${trimmed.slice(1)}`;
  }

  if (/^\+639\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function getMissingStudentProfileFields(
  values: Pick<
    StudentProfile,
    | 'dateOfBirth'
    | 'gender'
    | 'phone'
    | 'address'
    | 'familyName'
    | 'familyRelationship'
    | 'familyContact'
  >,
): string[] {
  return STUDENT_REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = values[field];
    return value === undefined || value === null || String(value).trim() === '';
  }).map((field) => STUDENT_FIELD_LABELS[field]);
}

export function getMissingTeacherProfileFields(
  values: Pick<
    TeacherProfile,
    | 'dateOfBirth'
    | 'gender'
    | 'phone'
    | 'address'
    | 'department'
    | 'specialization'
    | 'employeeId'
  >,
): string[] {
  return TEACHER_REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = values[field];
    return value === undefined || value === null || String(value).trim() === '';
  }).map((field) => TEACHER_FIELD_LABELS[field]);
}

export function isStudentProfileLocked(
  values: Partial<StudentProfile> | User | null | undefined,
): boolean {
  if (!values) return false;

  return STUDENT_REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = values[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

export function isTeacherProfileComplete(
  values: Partial<TeacherProfile> | User | null | undefined,
): boolean {
  if (!values) return false;

  return TEACHER_REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = values[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}
