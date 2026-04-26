import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sidebar } from './Sidebar';

const pushMock = jest.fn();
const prefetchMock = jest.fn();
const usePathnameMock = jest.fn();
const useAuthMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    push: pushMock,
    prefetch: prefetchMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/lib/auth-actions', () => ({
  logoutAction: jest.fn(),
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getTeacherPendingInterventionCount: jest.fn(),
  },
}));

describe('Sidebar route warmup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    usePathnameMock.mockReturnValue('/dashboard/admin');
    useAuthMock.mockReturnValue({
      role: 'admin',
      user: {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@lms.local',
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not prefetch dashboard navigation targets on initial render', async () => {
    render(<Sidebar shellRole="admin" />);
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(prefetchMock).not.toHaveBeenCalled();
    });
  });

  it('exposes JA Hub as a first-class student navigation item', () => {
    usePathnameMock.mockReturnValue('/dashboard/student');
    useAuthMock.mockReturnValue({
      role: 'student',
      user: {
        firstName: 'Student',
        lastName: 'User',
        email: 'student@lms.local',
      },
    });

    render(<Sidebar shellRole="student" />);

    fireEvent.click(screen.getByRole('button', { name: /JA Hub/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/student/ja');
  });
});
