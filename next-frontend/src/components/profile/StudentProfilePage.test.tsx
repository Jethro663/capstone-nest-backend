'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentProfilePage from './StudentProfilePage';
import { profileService } from '@/services/profile-service';

const setUserMock = jest.fn();
const refreshAuthMock = jest.fn();
const refreshMock = jest.fn();

let mockUser = {
  id: 'student-1',
  firstName: 'Jamie',
  lastName: 'Cruz',
  email: 'jamie@nexora.edu',
  roles: ['student'],
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: jest.fn(),
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

jest.mock('@/lib/auth-service', () => ({
  updateProfile: jest.fn(),
}));

jest.mock('@/services/profile-service', () => ({
  profileService: {
    getMine: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}));

jest.mock('@/components/profile/ProfileSecurityCard', () => ({
  ProfileSecurityCard: ({ children }: { children?: ReactNode }) => (
    <div>{children ?? 'Profile Security Card'}</div>
  ),
}));

const mockedProfileService = profileService as jest.Mocked<typeof profileService>;
type GetMineResponse = Awaited<ReturnType<typeof profileService.getMine>>;

describe('StudentProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshAuthMock.mockResolvedValue(undefined);
    mockUser = {
      id: 'student-1',
      firstName: 'Jamie',
      lastName: 'Cruz',
      email: 'jamie@nexora.edu',
      roles: ['student'],
    };
  });

  it('limits student phone typing to an 11-digit local mobile number', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: {
        phone: '',
        familyContact: '',
      },
    } as GetMineResponse);

    render(<StudentProfilePage />);

    const [phoneInput] = await screen.findAllByPlaceholderText('09XXXXXXXXX');
    fireEvent.change(phoneInput, {
      target: { value: '+6391712345678999' },
    });

    expect(phoneInput).toHaveValue('09171234567');
  });
});
