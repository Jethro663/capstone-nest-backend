import { render, waitFor } from '@testing-library/react';
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
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

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

    window.requestIdleCallback = ((callback: IdleRequestCallback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
      return 1;
    }) as typeof window.requestIdleCallback;

    window.cancelIdleCallback = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
  });

  it('prefetches dashboard navigation targets in the background', async () => {
    render(<Sidebar shellRole="admin" />);
    jest.runAllTimers();

    await waitFor(() => {
      expect(prefetchMock).toHaveBeenCalledWith('/dashboard/admin/diagnostics');
      expect(prefetchMock).toHaveBeenCalledWith('/dashboard/notifications');
    });
  });
});
