'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('uses profile and security tabs, defaulting to profile details', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile(),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    const profileTab = await screen.findByRole('tab', { name: /profile/i });
    const securityTab = screen.getByRole('tab', { name: /security/i });

    expect(profileTab).toHaveAttribute('data-state', 'active');
    expect(securityTab).toHaveAttribute('data-state', 'inactive');
    expect(
      screen.getByRole('button', { name: /save contact updates/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/coverage snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view .* profile alerts/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/school-managed profile information is visible/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Profile Security Card')).not.toBeInTheDocument();

    fireEvent.mouseDown(securityTab, { button: 0 });
    fireEvent.click(securityTab);

    await waitFor(() => {
      expect(securityTab).toHaveAttribute('data-state', 'active');
    });

    expect(
      screen.queryByRole('button', { name: /save contact updates/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Profile Security Card')).toBeInTheDocument();
  });

  it('renders immutable and editable indicators across the primary details card', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile(),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await screen.findByRole('tab', { name: /profile/i });

    fireEvent.click(screen.getByRole('button', { name: /school identity/i }));
    fireEvent.click(screen.getByRole('button', { name: /employment details/i }));

    expect(screen.getAllByText(/^school-managed$/i)).toHaveLength(8);
    expect(screen.getAllByText(/^editable here$/i)).toHaveLength(3);
    expect(screen.getAllByText(/cannot be edited here/i)).toHaveLength(8);
    expect(screen.getAllByText(/you can update this field on this page/i)).toHaveLength(3);
    expect(screen.getByLabelText('Date of Birth')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Gender')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: /change picture/i })).toBeInTheDocument();
  });

  it('shows pending school record when immutable teacher fields are blank', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        dateOfBirth: '',
        dob: '',
        gender: '',
        department: '',
        specialization: '',
        employeeId: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await screen.findByRole('tab', { name: /profile/i });
    const alertButton = screen.getByRole('button', {
      name: /view 5 profile alerts/i,
    });
    expect(alertButton).toBeInTheDocument();

    fireEvent.click(alertButton);

    expect(await screen.findByText(/profile alerts/i)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    const checklist = within(dialog).getByRole('list', { name: /teacher profile alerts checklist/i });
    expect(within(checklist).getByText('Date of Birth')).toBeInTheDocument();
    expect(within(checklist).getByText('Gender')).toBeInTheDocument();
    expect(within(checklist).getByText('Department')).toBeInTheDocument();
    expect(within(checklist).getByText('Employee ID')).toBeInTheDocument();
    expect(within(checklist).getByText('Specialization')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /review profile/i }));

    fireEvent.click(screen.getByRole('button', { name: /school identity/i }));
    fireEvent.click(screen.getByRole('button', { name: /employment details/i }));

    expect(screen.getAllByDisplayValue('Pending school record').length).toBeGreaterThanOrEqual(5);
  });

  it('groups details into collapsible categories like the sidebar', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile(),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await screen.findByRole('tab', { name: /profile/i });

    const schoolIdentityTrigger = screen.getByRole('button', { name: /school identity/i });
    const contactDetailsTrigger = screen.getByRole('button', { name: /contact details/i });
    const employmentTrigger = screen.getByRole('button', { name: /employment details/i });

    expect(schoolIdentityTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(contactDetailsTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(employmentTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/school-managed identity and personal record fields/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/editable teacher-owned contact information/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/school-managed employment and assignment record/i)).not.toBeInTheDocument();

    expect(screen.queryByDisplayValue('Alex')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();

    fireEvent.click(schoolIdentityTrigger);

    expect(schoolIdentityTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();

    fireEvent.click(employmentTrigger);

    expect(employmentTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByDisplayValue('EMP-001')).toBeInTheDocument();
  });

  it('opens the warning modal from the triangle alert button for editable issues', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        phone: '',
        contactNumber: '',
        address: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    const alertButton = await screen.findByRole('button', {
      name: /view 2 profile alerts/i,
    });
    fireEvent.click(alertButton);

    expect(await screen.findByText(/profile alerts/i)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    const checklist = within(dialog).getByRole('list', { name: /teacher profile alerts checklist/i });
    expect(within(checklist).getByText('Contact Number')).toBeInTheDocument();
    expect(within(checklist).getByText('Home Address')).toBeInTheDocument();
  });

  it('saves valid teacher-owned details and refreshes auth state', async () => {
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
        screen.getByRole('button', { name: /save contact updates/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save contact updates/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, save updates/i }));

    await waitFor(() =>
      expect(mockedTeacherProfileService.update).toHaveBeenCalledWith(
        'teacher-1',
        {
          phone: '+639123456789',
          contactNumber: '+639123456789',
          address: 'Quezon City',
          profilePicture: undefined,
        },
      ),
    );

    expect(refreshAuthMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(mockedToast.success).toHaveBeenCalledWith('Teacher profile saved');
  });

  it('shows missing-fields dialog and blocks save when teacher-owned fields are empty', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        phone: '',
        contactNumber: '',
        address: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save contact updates/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save contact updates/i }));

    await waitFor(() =>
      expect(screen.getByText(/profile alerts/i)).toBeInTheDocument(),
    );
    const dialog = screen.getByRole('dialog');
    const checklist = within(dialog).getByRole('list', { name: /teacher profile alerts checklist/i });
    expect(within(checklist).getByText('Contact Number')).toBeInTheDocument();
    expect(within(checklist).getByText('Home Address')).toBeInTheDocument();
    expect(mockedTeacherProfileService.update).not.toHaveBeenCalled();
  });

  it('allows saving editable fields even when school-managed values are blank', async () => {
    mockedTeacherProfileService.getMine
      .mockResolvedValueOnce({
        success: true,
        data: buildTeacherProfile({
          dateOfBirth: '',
          dob: '',
          gender: '',
          department: '',
          specialization: '',
          employeeId: '',
        }),
      } as GetMineResponse)
      .mockResolvedValueOnce({
        success: true,
        data: buildTeacherProfile({
          dateOfBirth: '',
          dob: '',
          gender: '',
          department: '',
          specialization: '',
          employeeId: '',
          phone: '+639123456789',
          contactNumber: '+639123456789',
        }),
      } as GetMineResponse);
    mockedTeacherProfileService.update.mockResolvedValue({
      success: true,
      message: 'Profile updated',
      data: buildTeacherProfile({
        dateOfBirth: '',
        dob: '',
        gender: '',
        department: '',
        specialization: '',
        employeeId: '',
      }),
    } as UpdateResponse);

    render(<TeacherProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save contact updates/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save contact updates/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, save updates/i }));

    await waitFor(() => expect(mockedTeacherProfileService.update).toHaveBeenCalledTimes(1));
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
        screen.getByRole('button', { name: /save contact updates/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save contact updates/i }));

    expect(mockedToast.error).toHaveBeenCalledWith(
      'Teacher contact number must be a valid Philippine mobile number',
    );
    expect(
      screen.queryByText(/confirm contact updates/i),
    ).not.toBeInTheDocument();
    expect(mockedTeacherProfileService.update).not.toHaveBeenCalled();
  });

  it('limits teacher phone typing to an 11-digit local mobile number', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        phone: '',
        contactNumber: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    const phoneInput = await screen.findByLabelText('Phone');
    fireEvent.change(phoneInput, {
      target: { value: '091712345678999' },
    });

    expect(phoneInput).toHaveValue('09171234567');
  });

  it('sanitizes teacher editable fields while typing', async () => {
    mockedTeacherProfileService.getMine.mockResolvedValue({
      success: true,
      data: buildTeacherProfile({
        phone: '',
        contactNumber: '',
        address: '',
      }),
    } as GetMineResponse);

    render(<TeacherProfilePage />);

    const phoneInput = await screen.findByLabelText('Phone');
    const addressInput = screen.getByPlaceholderText('Quezon City, Metro Manila');

    fireEvent.change(phoneInput, { target: { value: '+63 917-123-4567bad' } });
    fireEvent.change(addressInput, {
      target: { value: '  Blk. 4, Lot #2 <North> / Phase 1 ' },
    });

    expect(phoneInput).toHaveValue('09171234567');
    expect(addressInput).toHaveValue('Blk. 4, Lot #2 North / Phase 1');
  });
});
