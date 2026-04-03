export type DashboardRole = 'student' | 'teacher' | 'admin';

const DASHBOARD_ROLE_PREFIXES: Record<DashboardRole, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  admin: '/dashboard/admin',
};

function hasRolePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function normalizeDashboardRole(
  role: string | null | undefined,
): DashboardRole | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase();
  if (normalized === 'student' || normalized === 'teacher' || normalized === 'admin') {
    return normalized;
  }

  return null;
}

export function getDashboardScopedRoleFromPath(pathname: string): DashboardRole | null {
  if (hasRolePrefix(pathname, DASHBOARD_ROLE_PREFIXES.student)) return 'student';
  if (hasRolePrefix(pathname, DASHBOARD_ROLE_PREFIXES.teacher)) return 'teacher';
  if (hasRolePrefix(pathname, DASHBOARD_ROLE_PREFIXES.admin)) return 'admin';
  return null;
}

export function isDashboardRolePathAllowed(
  pathname: string,
  role: string | null | undefined,
): boolean {
  const scopedRole = getDashboardScopedRoleFromPath(pathname);
  if (!scopedRole) return true;

  const normalizedRole = normalizeDashboardRole(role);
  if (!normalizedRole) return false;

  return scopedRole === normalizedRole;
}
