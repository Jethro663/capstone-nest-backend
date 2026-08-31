'use client';

import type { User } from '@/types/user';

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentProfilePage from './StudentProfilePage';
import { profileService } from '@/services/profile-service';
import type { StudentProfile } from '@/types/profile';

const setUserMock = jest.fn();
const refreshAuthMock = jest.fn();
const refreshMock = jest.fn();
const pushMock = jest.fn();

let mockUser: Partial<User> = {
  id: 'student-1',
  firstName: 'Jamie',
  lastName: 'Cruz',
  email: 'jamie@nexora.edu',
  roles: ['student'],
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: pushMock,
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

const mockedProfileService = profileService as jest.Mocked<
  typeof profileService
>;
type GetMineResponse = Awaited<ReturnType<typeof profileService.getMine>>;

function buildStudentProfile(
  overrides: Partial<StudentProfile> = {},
): StudentProfile {
  return {
    id: 'profile-1',
    userId: 'student-1',
    dateOfBirth: '2008-05-01',
    dob: '2008-05-01',
    gender: 'Male',
    phone: '09123456789',
    address: 'Quezon City',
    familyName: 'Ana Cruz',
    familyRelationship: 'Mother',
    familyContact: '09987654321',
    lrn: '123456789012',
    gradeLevel: '10',
    profilePicture: '',
    ...overrides,
  };
}

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
      lrn: '123456789012',
      gradeLevel: '10',
    };
  });

  it('uses profile and account tabs, defaulting to the profile form', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile(),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    const profileTab = await screen.findByRole('tab', { name: /profile/i });
    const accountTab = screen.getByRole('tab', { name: /account/i });

    expect(profileTab).toHaveAttribute('data-state', 'active');
    expect(accountTab).toHaveAttribute('data-state', 'inactive');
    expect(
      screen.getByRole('tabpanel', { name: /profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Student Identity')).toBeInTheDocument();
    expect(screen.queryByText('Profile Security Card')).not.toBeInTheDocument();

    fireEvent.mouseDown(accountTab, { button: 0 });
    fireEvent.click(accountTab);

    await waitFor(() => {
      expect(accountTab).toHaveAttribute('data-state', 'active');
    });

    expect(screen.queryByText('Student Identity')).not.toBeInTheDocument();
    expect(screen.getByText('Profile Security Card')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /assessment history/i }),
    ).toBeInTheDocument();
  });

  it('opens the profile help guide, walks through all pages, and closes it', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile({
        address: '',
        familyName: '',
      }),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /profile help/i }),
    );

    expect(
      await screen.findByText('Student guide: My Profile'),
    ).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Get oriented on your profile page'),
    ).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Know which fields you can and cannot change'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 3 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Complete your editable profile details'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 4 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Use the account tools and history shortcuts'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText('Page 3 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close guide/i }));
    await waitFor(() => {
      expect(
        screen.queryByText('Student guide: My Profile'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows a missing-fields alert button beside the student name and opens a modal with the missing details', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile({
        address: '',
        familyName: '',
      }),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    const alertButton = await screen.findByRole('button', {
      name: /view 2 missing profile field details/i,
    });
    expect(alertButton).toBeInTheDocument();

    fireEvent.click(alertButton);

    expect(
      await screen.findByText(/missing required fields/i),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    const checklist = within(dialog).getByRole('list', {
      name: /missing student details checklist/i,
    });
    expect(within(checklist).getByText('Home Address')).toBeInTheDocument();
    expect(within(checklist).getByText('Guardian Name')).toBeInTheDocument();
  });

  it('hides the missing-fields alert button when all required profile details are present', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile(),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    await screen.findByRole('tab', { name: /profile/i });

    expect(
      screen.queryByRole('button', {
        name: /view .* missing profile field details/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('renders immutable field indicators only for school-managed fields', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile(),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    await screen.findByRole('tab', { name: /profile/i });

    expect(screen.getAllByText(/school-managed/i)).toHaveLength(6);
    expect(screen.getByDisplayValue('Jamie')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('Cruz')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('jamie@nexora.edu')).toHaveAttribute(
      'readonly',
    );
  });

  it('limits student phone typing to an 11-digit local mobile number', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile({
        phone: '',
        familyContact: '',
      }),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    const [phoneInput] = await screen.findAllByPlaceholderText('09XXXXXXXXX');
    fireEvent.change(phoneInput, {
      target: { value: '+6391712345678999' },
    });

    expect(phoneInput).toHaveValue('09171234567');
  });

  it('sanitizes guardian name and home address while typing', async () => {
    mockedProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildStudentProfile({
        phone: '',
        familyContact: '',
        address: '',
        familyName: '',
      }),
    } as GetMineResponse);

    render(<StudentProfilePage />);

    await screen.findAllByPlaceholderText('09XXXXXXXXX');
    const textboxes = screen.getAllByRole('textbox');
    const homeAddressInput = textboxes[7];
    const guardianInput = textboxes[8];

    fireEvent.change(guardianInput, {
      target: { value: '  Ana@@ Navarro🙂 123 ' },
    });
    fireEvent.change(homeAddressInput, {
      target: { value: '  Blk. 4, Lot #2 <North>🙂 / Phase 1 ' },
    });

    expect(guardianInput).toHaveValue('Ana Navarro');
    expect(homeAddressInput).toHaveValue('Blk. 4, Lot #2 North / Phase 1');
  });
});
