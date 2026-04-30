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

  it('toggles admin navigation categories open and closed', () => {
    usePathnameMock.mockReturnValue('/dashboard/admin/chatbot');

    render(<Sidebar shellRole="admin" />);

    const insightsCategory = screen.getByRole('button', {
      name: /Insights & AI/i,
    });

    expect(insightsCategory).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /AI Chatbot/i }),
    ).toBeInTheDocument();

    fireEvent.click(insightsCategory);

    expect(insightsCategory).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: /AI Chatbot/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(insightsCategory);

    expect(insightsCategory).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/reports');
  });

  it('toggles teacher navigation categories open and closed', () => {
    usePathnameMock.mockReturnValue('/dashboard/teacher/interventions');
    useAuthMock.mockReturnValue({
      role: 'teacher',
      user: {
        firstName: 'Teacher',
        lastName: 'User',
        email: 'teacher@lms.local',
      },
    });

    render(<Sidebar shellRole="teacher" />);

    const supportCategory = screen.getByRole('button', {
      name: /Insights & Support/i,
    });

    expect(supportCategory).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /Interventions/i }),
    ).toBeInTheDocument();

    fireEvent.click(supportCategory);

    expect(supportCategory).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: /Interventions/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(supportCategory);
    fireEvent.click(screen.getByRole('button', { name: /Performance/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/teacher/performance');
  });

  it('toggles student navigation categories open and closed', () => {
    usePathnameMock.mockReturnValue('/dashboard/student/ja');
    useAuthMock.mockReturnValue({
      role: 'student',
      user: {
        firstName: 'Student',
        lastName: 'User',
        email: 'student@lms.local',
      },
    });

    render(<Sidebar shellRole="student" />);

    const learningCategory = screen.getByRole('button', {
      name: /Learning/i,
    });

    expect(learningCategory).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /JA Hub/i })).toBeInTheDocument();

    fireEvent.click(learningCategory);

    expect(learningCategory).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: /JA Hub/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(learningCategory);
    fireEvent.click(screen.getByRole('button', { name: /My Courses/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/student/courses');
  });
});
