import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const pushMock = jest.fn();
const forgotPasswordActionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/lib/auth-actions', () => ({
  forgotPasswordAction: (...args: unknown[]) => forgotPasswordActionMock(...args),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the user on the same page and shows an account-missing dialog for unknown emails', async () => {
    forgotPasswordActionMock.mockResolvedValue({
      success: false,
      status: 404,
      message: 'Account does not exist.',
    });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'missing@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(screen.getByText('Account does not exist')).toBeInTheDocument();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/No Nexora account was found for that email address/i),
    ).toBeInTheDocument();
  });
});
