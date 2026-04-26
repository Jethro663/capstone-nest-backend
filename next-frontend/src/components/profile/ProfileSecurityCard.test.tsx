'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changePassword } from '@/lib/auth-service';
import { ProfileSecurityCard } from './ProfileSecurityCard';
import { toast } from 'sonner';

jest.mock('@/lib/auth-service', () => ({
  changePassword: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('ProfileSecurityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the teacher reveal and hide each password field', () => {
    render(<ProfileSecurityCard appearance="teacher" layout="teacher-parity" />);

    const current = screen.getByLabelText('Current Password');
    const next = screen.getByLabelText('New Password');
    const confirm = screen.getByLabelText('Confirm New Password');

    expect(current).toHaveAttribute('type', 'password');
    expect(next).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show current password/i }));
    fireEvent.click(screen.getByRole('button', { name: /show new password/i }));
    fireEvent.click(screen.getByRole('button', { name: /show confirm new password/i }));

    expect(current).toHaveAttribute('type', 'text');
    expect(next).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide current password/i }));
    expect(current).toHaveAttribute('type', 'password');
  });

  it('shows live password requirement status and blocks invalid submission with a specific error', async () => {
    render(<ProfileSecurityCard appearance="student" />);

    const newPassword = screen.getByLabelText('New Password');
    const confirmPassword = screen.getByLabelText('Confirm New Password');

    fireEvent.change(newPassword, { target: { value: 'Abcdef1!' } });

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('One number')).toBeInTheDocument();
    expect(screen.getByText('One special character')).toBeInTheDocument();

    fireEvent.change(confirmPassword, { target: { value: 'wrong-match' } });

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith('Current password is required');
    });
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('submits once the password fields satisfy the schema', async () => {
    mockedChangePassword.mockResolvedValue({
      success: true,
      message: 'Password changed successfully',
    });

    render(<ProfileSecurityCard appearance="student" />);

    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'Current1!' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalledWith({
        oldPassword: 'Current1!',
        newPassword: 'NewPassword1!',
        confirmPassword: 'NewPassword1!',
      });
    });
    expect(mockedToast.success).toHaveBeenCalledWith('Password changed');
  });
});
