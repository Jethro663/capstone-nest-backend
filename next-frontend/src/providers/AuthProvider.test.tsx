import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthProvider';
import { AUTH_REFRESH_TIMEOUT_MS, shouldBootstrapAuth } from '@/lib/auth-bootstrap';

const usePathnameMock = jest.fn();
const getCurrentUserActionMock = jest.fn();
const setAccessTokenMock = jest.fn();
const getAccessTokenMock = jest.fn();

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

jest.mock('@/lib/auth-actions', () => ({
  getCurrentUserAction: () => getCurrentUserActionMock(),
}));

jest.mock('@/lib/api-client', () => ({
  setAccessToken: (token: string | null) => setAccessTokenMock(token),
  getAccessToken: () => getAccessTokenMock(),
}));

function AuthProbe({ children }: { children?: ReactNode }) {
  const { loading, isAuthenticated, role, status } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="status">{status}</div>
      <div data-testid="role">{role ?? 'none'}</div>
      {children}
    </div>
  );
}

describe('shouldBootstrapAuth', () => {
  it('returns true for dashboard routes only', () => {
    expect(shouldBootstrapAuth('/dashboard')).toBe(true);
    expect(shouldBootstrapAuth('/dashboard/student')).toBe(true);
    expect(shouldBootstrapAuth('/login')).toBe(false);
    expect(shouldBootstrapAuth('/')).toBe(false);
  });
});

describe('AuthProvider', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    getAccessTokenMock.mockReturnValue(null);
  });

  it('skips refresh bootstrap on public auth routes', async () => {
    usePathnameMock.mockReturnValue('/login');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('bootstraps auth on dashboard routes', async () => {
    usePathnameMock.mockReturnValue('/dashboard/student');
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
        },
      },
    } as never);
    getCurrentUserActionMock.mockResolvedValue({
      success: true,
      user: {
        firstName: 'Liam',
        lastName: 'Navarro',
        roles: ['student'],
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true, timeout: AUTH_REFRESH_TIMEOUT_MS }),
    );
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-token');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('role')).toHaveTextContent('student');
  });

  it('retries current-user lookup once before settling authenticated', async () => {
    usePathnameMock.mockReturnValue('/dashboard/student');
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
        },
      },
    } as never);
    getCurrentUserActionMock
      .mockResolvedValueOnce({ success: false, user: null })
      .mockResolvedValueOnce({
        success: true,
        user: {
          firstName: 'Liam',
          lastName: 'Navarro',
          roles: ['student'],
        },
      });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(getCurrentUserActionMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('exits loading when refresh request times out', async () => {
    usePathnameMock.mockReturnValue('/dashboard');
    mockedAxios.post.mockRejectedValue(new Error('timeout'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(setAccessTokenMock).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('exits loading when refresh is aborted by the browser', async () => {
    usePathnameMock.mockReturnValue('/dashboard');
    mockedAxios.post.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(setAccessTokenMock).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('does not re-bootstrap on in-dashboard route changes once authenticated', async () => {
    usePathnameMock.mockReturnValue('/dashboard/admin');
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
        },
      },
    } as never);
    getAccessTokenMock.mockReturnValue('access-token');
    getCurrentUserActionMock.mockResolvedValue({
      success: true,
      user: {
        firstName: 'System',
        lastName: 'Admin',
        roles: ['admin'],
      },
    });

    const { rerender } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    usePathnameMock.mockReturnValue('/dashboard/admin/diagnostics');

    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('does not refresh again when an authenticated session re-enters the dashboard from a public route', async () => {
    usePathnameMock.mockReturnValue('/dashboard/admin');
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
        },
      },
    } as never);
    getAccessTokenMock.mockReturnValue('access-token');
    getCurrentUserActionMock.mockResolvedValue({
      success: true,
      user: {
        firstName: 'System',
        lastName: 'Admin',
        roles: ['admin'],
      },
    });

    const { rerender } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    usePathnameMock.mockReturnValue('/login');
    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    usePathnameMock.mockReturnValue('/dashboard/admin/diagnostics');
    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
