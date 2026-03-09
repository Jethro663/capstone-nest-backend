import { normalizePhilippinePhone } from '@/utils/profile';

/** Backend may return role as a plain string OR as an object { id, name, ... } */
export function getRoleName(role: unknown): string {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role !== null && 'name' in role)
    return (role as { name: string }).name;
  return String(role);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function truncateText(text: string, maxLength = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function formatTimeSince(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function getDescription(desc: unknown): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object' && desc !== null && 'description' in desc) {
    return (desc as { description: string }).description;
  }
  return '';
}

export function getTeacherName(teacher: unknown): string {
  if (!teacher) return 'Instructor';
  if (typeof teacher === 'string') return teacher;
  if (typeof teacher === 'object' && teacher !== null) {
    const t = teacher as { firstName?: string; lastName?: string };
    const name = `${t.firstName || ''} ${t.lastName || ''}`.trim();
    return name || 'Instructor';
  }
  return 'Instructor';
}

export function isProfileIncomplete(user: Record<string, unknown> | null, profile?: Record<string, unknown> | null): boolean {
  if (!user) return false;
  const roles = user.roles as string[] | undefined;
  if (roles?.includes('admin') || roles?.includes('teacher')) return false;

  const hasValue = (v: unknown) =>
    v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());

  if (!hasValue(user.firstName) || !hasValue(user.lastName)) return true;

  const fields = ['dateOfBirth', 'gender', 'phone', 'address', 'familyName', 'familyRelationship', 'familyContact'];
  for (const f of fields) {
    const v =
      f === 'dateOfBirth'
        ? (profile?.dateOfBirth ?? profile?.dob ?? user.dateOfBirth ?? user.dob)
        : (profile?.[f] ?? user[f]);
    if (!hasValue(v)) return true;
  }
  return false;
}

export function isValidPHPhone(value: string): boolean {
  return normalizePhilippinePhone(value) !== null;
}
