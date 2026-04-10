import {
  login,
  logout,
  logoutAll,
  validateCredentials,
} from './auth-service';
import { api } from './api-client';

jest.mock('./api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('auth-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  it('uses public auth request config for login and validation endpoints', async () => {
    await login({ email: 'student@lms.local', password: 'Student123!' });
    await validateCredentials({
      email: 'student@lms.local',
      password: 'Student123!',
    });

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/auth/login',
      { email: 'student@lms.local', password: 'Student123!' },
      expect.objectContaining({
        withCredentials: true,
        skipAuthRefresh: true,
        skipSessionExpiredRedirect: true,
      }),
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/auth/validate-credentials',
      { email: 'student@lms.local', password: 'Student123!' },
      expect.objectContaining({
        withCredentials: true,
        skipAuthRefresh: true,
        skipSessionExpiredRedirect: true,
      }),
    );
  });

  it('uses public auth request config for logout endpoints', async () => {
    await logout();
    await logoutAll();

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/auth/logout',
      {},
      expect.objectContaining({
        withCredentials: true,
        skipAuthRefresh: true,
        skipSessionExpiredRedirect: true,
      }),
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/auth/logout-all',
      {},
      expect.objectContaining({
        withCredentials: true,
        skipAuthRefresh: true,
        skipSessionExpiredRedirect: true,
      }),
    );
  });
});
