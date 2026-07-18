import { render, screen, waitFor } from '@testing-library/react';
import DashboardLayout from './layout';

const replaceMock = jest.fn();
const usePathnameMock = jest.fn();
const useAuthMock = jest.fn();
const logoutActionMock = jest.fn();
const notificationProviderMock = jest.fn();
const toastInfoMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/lib/auth-actions', () => ({
  logoutAction: () => logoutActionMock(),
}));

jest.mock('sonner', () => ({
  toast: {
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

jest.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <div data-testid="topbar" />,
}));

jest.mock('@/components/student/StudentTutorLauncher', () => ({
  StudentTutorLauncher: () => null,
}));

jest.mock('@/components/student/UnfinishedAttemptNotifier', () => ({
  UnfinishedAttemptNotifier: () => null,
}));

jest.mock('@/components/shared/AppOrbitLoader', () => ({
  AppOrbitLoader: ({ variant }: { variant: 'student' | 'calm' }) => (
    <div data-testid="app-orbit-loader" data-variant={variant} />
  ),
}));

jest.mock('@/providers/NotificationProvider', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => {
    notificationProviderMock();
    return <div data-testid="notification-provider">{children}</div>;
  },
}));

describe('DashboardLayout loading behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    useAuthMock.mockReturnValue({
      loading: true,
      isAuthenticated: false,
      isProfileIncomplete: false,
      role: null,
    });
  });

  it('shows the student loader variant when auth is loading on student routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/student/courses');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(screen.getByTestId('app-orbit-loader')).toHaveAttribute('data-variant', 'student');
    expect(screen.queryByTestId('notification-provider')).not.toBeInTheDocument();
  });

  it('shows the calm loader variant when auth is loading on non-student routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/admin');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(screen.getByTestId('app-orbit-loader')).toHaveAttribute('data-variant', 'calm');
  });
});

describe('DashboardLayout role-path enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      isProfileIncomplete: false,
      role: 'student',
    });
  });

  it('redirects a student away from teacher routes without ending the session', async () => {
    usePathnameMock.mockReturnValue('/dashboard/teacher/classes');

    const { rerender } = render(
      <DashboardLayout><div>foreign content</div></DashboardLayout>,
    );

    expect(screen.getByTestId('app-orbit-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('foreign content')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/student');
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('nexora.dashboard.roleMismatchNotice')).toBe(
      'pending',
    );
    expect(logoutActionMock).not.toHaveBeenCalled();

    usePathnameMock.mockReturnValue('/dashboard/student');
    rerender(<DashboardLayout><div>student content</div></DashboardLayout>);

    expect(screen.getByText('student content')).toBeInTheDocument();
    await waitFor(() => {
      expect(toastInfoMock).toHaveBeenCalledWith(
        'That page is not available for your account.',
      );
    });
    expect(toastInfoMock).toHaveBeenCalledTimes(1);
    expect(
      window.sessionStorage.getItem('nexora.dashboard.roleMismatchNotice'),
    ).toBeNull();
  });

  it('redirects a teacher away from student routes without ending the session', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      isProfileIncomplete: false,
      role: 'teacher',
    });
    usePathnameMock.mockReturnValue('/dashboard/student/courses');

    render(<DashboardLayout><div>foreign content</div></DashboardLayout>);

    expect(screen.getByTestId('app-orbit-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('foreign content')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/teacher/classes');
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('nexora.dashboard.roleMismatchNotice')).toBe(
      'pending',
    );
    expect(logoutActionMock).not.toHaveBeenCalled();
  });

  it('does not logout on matching role-scoped routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/student/courses');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(logoutActionMock).not.toHaveBeenCalled();
    expect(notificationProviderMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('notification-provider')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('does not logout on shared dashboard routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/notifications');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(logoutActionMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
