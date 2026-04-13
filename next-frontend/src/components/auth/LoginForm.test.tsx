import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const useSearchParamsMock = jest.fn();
const loginActionMock = jest.fn();
const validateCredentialsActionMock = jest.fn();
const setUserMock = jest.fn();
const toastSuccessMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock('@/lib/auth-actions', () => ({
  loginAction: (...args: unknown[]) => loginActionMock(...args),
  validateCredentialsAction: (...args: unknown[]) =>
    validateCredentialsActionMock(...args),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    setUser: setUserMock,
    isAuthenticated: false,
    loading: false,
    role: null,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

function createSearchParams(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return {
    get: (key: string) => searchParams.get(key),
  };
}

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParamsMock.mockReturnValue(createSearchParams());
    validateCredentialsActionMock.mockResolvedValue({ success: false });
  });

  it('routes admins directly to their scoped dashboard after login', async () => {
    loginActionMock.mockResolvedValue({
      success: true,
      user: {
        firstName: 'System',
        lastName: 'Admin',
        roles: ['admin'],
      },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'admin@lms.local' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Test@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  it('keeps shared dashboard destinations when provided in the from param', async () => {
    useSearchParamsMock.mockReturnValue(
      createSearchParams({ from: '/dashboard/notifications' }),
    );
    loginActionMock.mockResolvedValue({
      success: true,
      user: {
        firstName: 'Tina',
        lastName: 'Teacher',
        roles: ['teacher'],
      },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'teacher@lms.local' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Test@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/notifications');
    });
  });
});
