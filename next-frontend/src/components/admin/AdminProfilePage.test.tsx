'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminProfilePage } from './AdminProfilePage';
import { changePassword, updateProfile } from '@/lib/auth-service';

const setUserMock = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex@nexora.edu',
      roles: ['admin'],
    },
    setUser: setUserMock,
  }),
}));

jest.mock('@/lib/auth-service', () => ({
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));

const mockedUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;
const mockedChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;
type UpdateProfileResponse = Awaited<ReturnType<typeof updateProfile>>;
type ChangePasswordResponse = Awaited<ReturnType<typeof changePassword>>;

describe('AdminProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateProfile.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'admin-1',
          firstName: 'Alex',
          lastName: 'Rivera',
          email: 'alex@nexora.edu',
          roles: ['admin'],
        } as unknown as NonNullable<UpdateProfileResponse['data']>['user'],
      },
    } as UpdateProfileResponse);
    mockedChangePassword.mockResolvedValue({ success: true } as ChangePasswordResponse);
  });

  it('submits profile changes using auth profile endpoint', async () => {
    render(<AdminProfilePage />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alexa' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Rivera' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockedUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Alexa',
        lastName: 'Rivera',
      }),
    );
    expect(setUserMock).toHaveBeenCalled();
  });

  it('submits password update when fields are completed', async () => {
    render(<AdminProfilePage />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldPass123' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newPass123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'newPass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() =>
      expect(mockedChangePassword).toHaveBeenCalledWith({
        oldPassword: 'oldPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      }),
    );
  });
});
