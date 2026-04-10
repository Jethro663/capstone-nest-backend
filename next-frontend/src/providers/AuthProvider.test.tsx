import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import axios from 'axios';
import {
  AuthProvider,
  useAuth,
  shouldBootstrapAuth,
} from './AuthProvider';

const usePathnameMock = jest.fn();
const getCurrentUserActionMock = jest.fn();
const setAccessTokenMock = jest.fn();

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
}));

function AuthProbe({ children }: { children?: ReactNode }) {
  const { loading, isAuthenticated, role } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
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
      expect.objectContaining({ withCredentials: true, timeout: 10000 }),
    );
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-token');
    expect(screen.getByTestId('role')).toHaveTextContent('student');
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
  });
});
