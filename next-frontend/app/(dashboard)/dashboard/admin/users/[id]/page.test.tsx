'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUserDetailPage from './page';
import { userService } from '@/services/user-service';
import { toast } from 'sonner';

const backMock = jest.fn();
const pushMock = jest.fn();
let demoModeActive = false;

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-1' }),
  useRouter: () => ({
    back: backMock,
    push: pushMock,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/providers/AdminDemoModeProvider', () => ({
  useAdminDemoMode: () => ({
    status: demoModeActive
      ? {
          active: true,
          relaxedRules: [{ code: 'user_lifecycle_sequence' }],
        }
      : { active: false, relaxedRules: [] },
    refresh: jest.fn(),
  }),
}));

jest.mock('@/services/user-service', () => ({
  userService: {
    getById: jest.fn(),
    update: jest.fn(),
    resetPassword: jest.fn(),
    reactivate: jest.fn(),
    softDelete: jest.fn(),
    purge: jest.fn(),
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

const studentUser = {
  id: 'student-1',
  firstName: 'Liam',
  middleName: '',
  lastName: 'Navarro',
  email: 'liam@nexora.edu',
  roles: ['student'],
  status: 'ACTIVE',
  isEmailVerified: true,
  lrn: '202407000001',
  gradeLevel: '7',
  dateOfBirth: '2012-01-10T00:00:00.000Z',
  gender: 'Male',
  phone: '09171234567',
  familyName: 'Ana Navarro',
  familyRelationship: 'Mother',
  familyContact: '09179876543',
  createdAt: '2026-03-27T00:00:00.000Z',
};

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    demoModeActive = false;
    mockedUserService.getById.mockResolvedValue({
      success: true,
      data: { user: studentUser },
    } as Awaited<ReturnType<typeof userService.getById>>);
    mockedUserService.update.mockResolvedValue({
      success: true,
      message: 'updated',
      data: { user: studentUser },
    } as Awaited<ReturnType<typeof userService.update>>);
  });

  it('blocks saving when required student QA fields are missing after sanitization', async () => {
    const { container } = render(<AdminUserDetailPage />);
    await screen.findByRole('heading', { name: 'Liam Navarro' });

    const inputs = Array.from(container.querySelectorAll('input'));
    const firstName = inputs[0];
    const lastName = inputs[2];
    const dateOfBirth = inputs[5];
    const phone = inputs[6];
    const guardianName = inputs[8];
    const guardianContact = inputs[9];

    fireEvent.change(firstName, { target: { value: 'Liam7' } });
    fireEvent.change(lastName, { target: { value: 'Navarro!' } });
    fireEvent.change(dateOfBirth, { target: { value: '' } });
    fireEvent.change(phone, { target: { value: '091712345678' } });
    fireEvent.change(guardianName, { target: { value: '' } });
    fireEvent.change(guardianContact, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Date of birth, gender, student contact number, guardian name, relationship, and guardian contact are required for student accounts.',
      ),
    );
    expect(mockedUserService.update).not.toHaveBeenCalled();
  });

  it('sanitizes editable student inputs before submit', async () => {
    const { container } = render(<AdminUserDetailPage />);
    await screen.findByRole('heading', { name: 'Liam Navarro' });

    const inputs = Array.from(container.querySelectorAll('input'));
    const firstName = inputs[0];
    const email = inputs[3];
    const phone = inputs[6];
    const address = inputs[7];
    const guardianName = inputs[8];
    const guardianContact = inputs[9];

    fireEvent.change(firstName, { target: { value: ' Liam🙂  ' } });
    fireEvent.change(email, {
      target: { value: '  Liam.Student @Example.COM🙂  ' },
    });
    fireEvent.change(phone, { target: { value: '+63 917-123-4567abc' } });
    fireEvent.change(address, {
      target: { value: '  Blk. 4, Lot #2 <North>🙂 / Phase 1 ' },
    });
    fireEvent.change(guardianName, {
      target: { value: '  Ana@@ Navarro🙂 123 ' },
    });
    fireEvent.change(guardianContact, {
      target: { value: '+63 917-987-6543abc' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockedUserService.update).toHaveBeenCalledWith(
        'student-1',
        expect.objectContaining({
          firstName: 'Liam',
          email: 'liam.student@example.com',
          phone: '09171234567',
          address: 'Blk. 4, Lot #2 North / Phase 1',
          familyName: 'Ana Navarro',
          familyContact: '09179876543',
        }),
      ),
    );
  });

  it('keeps a deleted account read-only while retaining guarded purge in normal mode', async () => {
    mockedUserService.getById.mockResolvedValueOnce({
      success: true,
      data: { user: { ...studentUser, status: 'DELETED' } },
    } as Awaited<ReturnType<typeof userService.getById>>);

    render(<AdminUserDetailPage />);

    await screen.findByRole('heading', { name: 'Liam Navarro' });
    expect(screen.getByDisplayValue('Liam')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Reactivate user/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Purge user/i }),
    ).toBeInTheDocument();
  });

  it('allows editing and direct reactivation of a deleted account only in Demo mode', async () => {
    demoModeActive = true;
    mockedUserService.getById.mockResolvedValueOnce({
      success: true,
      data: { user: { ...studentUser, status: 'DELETED' } },
    } as Awaited<ReturnType<typeof userService.getById>>);

    render(<AdminUserDetailPage />);

    await screen.findByRole('heading', { name: 'Liam Navarro' });
    expect(screen.getByDisplayValue('Liam')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Reactivate user/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Purge user/i }),
    ).toBeInTheDocument();
  });

  it('exposes direct archive for an active account only in Demo mode', async () => {
    demoModeActive = true;
    render(<AdminUserDetailPage />);

    await screen.findByRole('heading', { name: 'Liam Navarro' });
    expect(
      screen.getByRole('button', { name: /Archive user/i }),
    ).toBeInTheDocument();
  });

  it('keeps permanent purge behind deleted status and exact full-name confirmation', async () => {
    mockedUserService.getById.mockResolvedValueOnce({
      success: true,
      data: { user: { ...studentUser, status: 'DELETED' } },
    } as Awaited<ReturnType<typeof userService.getById>>);
    render(<AdminUserDetailPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /Purge user/i }),
    );
    const confirmButton = screen.getAllByRole('button', {
      name: /^Purge user$/i,
    }).at(-1)!;
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type Liam Navarro'), {
      target: { value: 'Liam Navarro' },
    });
    expect(confirmButton).toBeEnabled();
  });
});
