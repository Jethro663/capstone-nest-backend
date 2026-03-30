import { render, screen } from '@testing-library/react';
import DashboardLayout from './layout';

const replaceMock = jest.fn();
const usePathnameMock = jest.fn();
const useAuthMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
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

describe('DashboardLayout loading behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({
      loading: true,
      isAuthenticated: false,
      isProfileIncomplete: false,
    });
  });

  it('shows the student loader variant when auth is loading on student routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/student/courses');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(screen.getByTestId('app-orbit-loader')).toHaveAttribute('data-variant', 'student');
  });

  it('shows the calm loader variant when auth is loading on non-student routes', () => {
    usePathnameMock.mockReturnValue('/dashboard/admin');

    render(<DashboardLayout><div>content</div></DashboardLayout>);

    expect(screen.getByTestId('app-orbit-loader')).toHaveAttribute('data-variant', 'calm');
  });
});

