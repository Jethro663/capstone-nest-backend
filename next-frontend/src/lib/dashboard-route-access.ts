export type DashboardRole = 'student' | 'teacher' | 'admin';

const INTERNAL_ROUTE_BASE = 'https://nexora.local';

const DASHBOARD_ROLE_PREFIXES: Record<DashboardRole, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  admin: '/dashboard/admin',
};

const DASHBOARD_ROLE_DEFAULT_ROUTES: Record<DashboardRole, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher/classes',
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

export function getDefaultDashboardRouteForRole(
  role: string | null | undefined,
): string {
  const normalizedRole = normalizeDashboardRole(role);

  if (!normalizedRole) {
    return '/dashboard';
  }

  return DASHBOARD_ROLE_DEFAULT_ROUTES[normalizedRole];
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

export function resolvePostLoginDestination(
  role: string | null | undefined,
  requestedPath?: string | null,
): string {
  const fallbackPath = getDefaultDashboardRouteForRole(role);
  const normalizedRequestedPath = normalizeRequestedPath(requestedPath);

  if (!normalizedRequestedPath || normalizedRequestedPath === '/dashboard') {
    return fallbackPath;
  }

  if (normalizedRequestedPath === '/complete-profile') {
    return normalizedRequestedPath;
  }

  if (!normalizedRequestedPath.startsWith('/dashboard')) {
    return fallbackPath;
  }

  return isDashboardRolePathAllowed(normalizedRequestedPath, role)
    ? normalizedRequestedPath
    : fallbackPath;
}

function normalizeRequestedPath(requestedPath?: string | null): string | null {
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
    return null;
  }

  try {
    const normalized = new URL(requestedPath, INTERNAL_ROUTE_BASE);
    if (normalized.origin !== INTERNAL_ROUTE_BASE) {
      return null;
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return null;
  }
}
