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
    expect(getDefaultDashboardRouteForRole('teacher')).toBe('/dashboard/teacher/classes');
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
    expect(resolvePostLoginDestination('teacher')).toBe('/dashboard/teacher/classes');
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

  it('rejects auth-route and malformed public return paths', () => {
    expect(resolvePostLoginDestination('teacher', '/login?from=%2Fdashboard')).toBe(
      '/dashboard/teacher/classes',
    );
    expect(resolvePostLoginDestination('teacher', '//evil.example')).toBe(
      '/dashboard/teacher/classes',
    );
  });

  it('preserves the complete-profile route when explicitly requested', () => {
    expect(resolvePostLoginDestination('student', '/complete-profile')).toBe(
      '/complete-profile',
    );
  });
});
