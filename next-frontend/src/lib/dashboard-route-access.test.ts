import {
  getDefaultDashboardRouteForRole,
  isDashboardRolePathAllowed,
  resolvePostLoginDestination,
} from './dashboard-route-access';

describe('isDashboardRolePathAllowed', () => {
  it('rejects teacher role on student dashboard paths', () => {
    expect(isDashboardRolePathAllowed('/dashboard/student/classes/abc', 'teacher')).toBe(
      false,
    );
  });

  it('allows matching role dashboard paths', () => {
    expect(isDashboardRolePathAllowed('/dashboard/student/classes/abc', 'student')).toBe(
      true,
    );
  });
});

describe('getDefaultDashboardRouteForRole', () => {
  it('maps known roles to their scoped dashboard route', () => {
    expect(getDefaultDashboardRouteForRole('admin')).toBe('/dashboard/admin');
    expect(getDefaultDashboardRouteForRole('teacher')).toBe('/dashboard/teacher');
    expect(getDefaultDashboardRouteForRole('student')).toBe('/dashboard/student');
  });

  it('falls back to the generic dashboard for unknown roles', () => {
    expect(getDefaultDashboardRouteForRole('guardian')).toBe('/dashboard');
    expect(getDefaultDashboardRouteForRole(null)).toBe('/dashboard');
  });
});

describe('resolvePostLoginDestination', () => {
  it('routes known roles directly to their scoped dashboard home', () => {
    expect(resolvePostLoginDestination('admin')).toBe('/dashboard/admin');
    expect(resolvePostLoginDestination('teacher')).toBe('/dashboard/teacher');
  });

  it('preserves shared dashboard routes after login', () => {
    expect(resolvePostLoginDestination('teacher', '/dashboard/notifications')).toBe(
      '/dashboard/notifications',
    );
  });

  it('rejects dashboard paths outside of the authenticated role scope', () => {
    expect(resolvePostLoginDestination('admin', '/dashboard/student/classes')).toBe(
      '/dashboard/admin',
    );
  });
});
