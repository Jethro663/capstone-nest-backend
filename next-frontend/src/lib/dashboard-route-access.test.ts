import { isDashboardRolePathAllowed } from './dashboard-route-access';

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
