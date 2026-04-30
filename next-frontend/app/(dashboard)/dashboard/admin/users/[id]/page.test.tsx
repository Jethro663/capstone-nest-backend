'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUserDetailPage from './page';
import { userService } from '@/services/user-service';
import { toast } from 'sonner';

const backMock = jest.fn();
const pushMock = jest.fn();

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

jest.mock('@/services/user-service', () => ({
  userService: {
    getById: jest.fn(),
    update: jest.fn(),
    resetPassword: jest.fn(),
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
  roles: [{ id: 'role-student', name: 'student' }],
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
      target: { value: "  Ana@@ Navarro🙂 123 " },
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
});
