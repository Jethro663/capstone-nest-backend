'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import TeacherProfilePage from './TeacherProfilePage';
import { teacherProfileService } from '@/services/teacher-profile-service';
import { toast } from 'sonner';
import type { TeacherProfile } from '@/types/profile';

const setUserMock = jest.fn();
const refreshAuthMock = jest.fn();
const refreshMock = jest.fn();

let mockUser = {
  id: 'teacher-1',
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex@nexora.edu',
  roles: ['teacher'],
};

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    setUser: setUserMock,
    refreshAuth: refreshAuthMock,
  }),
}));

jest.mock('@/components/profile/ProfileSecurityCard', () => ({
  ProfileSecurityCard: ({ children }: { children?: ReactNode }) => (
    <div>{children ?? 'Profile Security Card'}</div>
  ),
}));

jest.mock('@/services/teacher-profile-service', () => ({
  teacherProfileService: {
    getMine: jest.fn(),
    update: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}));

const mockedTeacherProfileService = teacherProfileService as jest.Mocked<
  typeof teacherProfileService
>;
const mockedToast = toast as jest.Mocked<typeof toast>;
type GetMineResponse = Awaited<ReturnType<typeof teacherProfileService.getMine>>;
type UpdateResponse = Awaited<ReturnType<typeof teacherProfileService.update>>;

function buildTeacherProfile(
  overrides: Partial<TeacherProfile> = {},
): TeacherProfile {
  return {
    userId: 'teacher-1',
    dateOfBirth: '1990-01-10',
    dob: '1990-01-10',
    gender: 'Male',
    phone: '09123456789',
    contactNumber: '09123456789',
    address: 'Quezon City',
    department: 'Math',
    specialization: 'Algebra',
    employeeId: 'EMP-001',
    profilePicture: '',
    ...overrides,
  };
}

describe('TeacherProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshAuthMock.mockResolvedValue(undefined);
    mockUser = {
      id: 'teacher-1',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex@nexora.edu',
      roles: ['teacher'],
    };
  });

  it('saves valid teacher details and refreshes auth state', async () => {
    mockedTeacherProfileService.getMine
      .mockResolvedValueOnce({
        success: true,
        data: buildTeacherProfile(),
      } as GetMineResponse)
      .mockResolvedValueOnce({
        success: true,
        data: buildTeacherProfile({
          phone: '+639123456789',
          contactNumber: '+639123456789',
        }),
      } as GetMineResponse);
    mockedTeacherProfileService.update.mockResolvedValue({
      success: true,
      message: 'Profile updated',
      data: buildTeacherProfile(),
    } as UpdateResponse);

    render(<TeacherProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save profile/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, save details/i }));

    await waitFor(() =>
      expect(mockedTeacherProfileService.update).toHaveBeenCalledWith(
        'teacher-1',
        expect.objectContaining({
          phone: '+639123456789',
          contactNumber: '+639123456789',
          department: 'Math',
          specialization: 'Algebra',
          employeeId: 'EMP-001',
        }),
      ),
    );

    expect(refreshAuthMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(mockedToast.success).toHaveBeenCalledWith('Teacher profile saved');
  });

  it('shows missing-fields dialog and blocks save when required fields are empty', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        department: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save profile/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() =>
      expect(screen.getByText(/missing required fields/i)).toBeInTheDocument(),
    );
    expect(mockedTeacherProfileService.update).not.toHaveBeenCalled();
  });

  it('rejects invalid phone formats before opening confirm dialog', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        phone: '12345',
        contactNumber: '12345',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save profile/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    expect(mockedToast.error).toHaveBeenCalledWith(
      'Teacher contact number must be a valid Philippine mobile number',
    );
    expect(
      screen.queryByText(/confirm teacher details/i),
    ).not.toBeInTheDocument();
    expect(mockedTeacherProfileService.update).not.toHaveBeenCalled();
  });
});
