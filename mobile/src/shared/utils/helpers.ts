import type { StudentProfile } from '@/types/profile';
import type { User } from '@/types/user';

export function getRoleName(role: unknown): string {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role !== null && 'name' in role) {
    return String((role as { name?: string }).name ?? '');
  }
  return String(role);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(value?: string | Date | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return 'No data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No data';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDescription(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'description' in value) {
    return String((value as { description?: string }).description ?? '');
  }
  return '';
}

export function getTeacherName(teacher: unknown) {
  if (!teacher) return 'Instructor';
  if (typeof teacher === 'string') return teacher;
  if (typeof teacher === 'object' && teacher !== null) {
    const entry = teacher as { firstName?: string; lastName?: string };
    return `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim() || 'Instructor';
  }
  return 'Instructor';
}

export function normalizePhilippinePhone(value: string) {
  const trimmed = value.trim();
  if (/^09\d{9}$/.test(trimmed)) {
    return `+63${trimmed.slice(1)}`;
  }
  if (/^\+639\d{9}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

const requiredProfileFields = [
  'dateOfBirth',
  'gender',
  'phone',
  'address',
  'familyName',
  'familyRelationship',
  'familyContact',
] as const;

const profileFieldLabels: Record<(typeof requiredProfileFields)[number], string> = {
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  phone: 'Contact Number',
  address: 'Home Address',
  familyName: 'Guardian Name',
  familyRelationship: 'Guardian Relationship',
  familyContact: 'Guardian Contact Number',
};

export function normalizeStudentProfile(profile: Partial<StudentProfile> | null | undefined) {
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

export function mergeUserWithStudentProfile(user: User | null, profile: StudentProfile | null) {
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

export function isStudentProfileLocked(values: Partial<StudentProfile> | User | null | undefined) {
  if (!values) return false;
  return requiredProfileFields.every((field) => {
    const value = values[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
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
) {
  return requiredProfileFields
    .filter((field) => {
      const value = values[field];
      return value === undefined || value === null || String(value).trim() === '';
    })
    .map((field) => profileFieldLabels[field]);
}
