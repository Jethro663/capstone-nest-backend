'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import AdminUserDetailPage from './page';
import { userService } from '@/services/user-service';

const push = jest.fn();
const back = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-1' }),
  useRouter: () => ({ push, back }),
}));

jest.mock('@/services/user-service', () => ({
  userService: {
    getById: jest.fn(),
    update: jest.fn(),
    resetPassword: jest.fn(),
    softDelete: jest.fn(),
    reactivate: jest.fn(),
  },
}));

jest.mock('@/providers/AdminMaintenanceProvider', () => ({
  useAdminMaintenance: () => ({ status: null, refresh: jest.fn() }),
}));

jest.mock('@/components/admin/AdminErasureBatchDialog', () => ({
  AdminErasureBatchDialog: () => null,
}));

const mockedUserService = jest.mocked(userService);

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getById.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'student-1',
          email: 'jamie@nexora.edu',
          firstName: 'Jamie',
          middleName: 'Reyes',
          lastName: 'Cruz',
          roles: ['student'],
          status: 'ACTIVE',
          isEmailVerified: true,
          lrn: '123456789012',
          gradeLevel: '7',
          dateOfBirth: '2013-02-03',
          gender: 'Female',
          phone: '09171234567',
          address: 'GABHS Campus',
          familyName: 'Maria Cruz',
          familyRelationship: 'Mother',
          familyContact: '09179876543',
          createdAt: '2026-08-01T00:00:00.000Z',
          lastLoginAt: '2026-09-26T01:00:00.000Z',
        },
      },
    });
  });

  it('sections student details and keeps password reset behind confirmation', async () => {
    render(<AdminUserDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Jamie Cruz' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Student Details' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Account' }), {
      button: 0,
    });

    const resetAction = screen.getByRole('button', { name: /Reset password/i });
    expect(resetAction).toHaveTextContent('Generate a new temporary password');
    expect(mockedUserService.resetPassword).not.toHaveBeenCalled();

    fireEvent.click(resetAction);

    expect(screen.getByRole('heading', { name: 'Reset User Password' })).toBeInTheDocument();
    expect(mockedUserService.resetPassword).not.toHaveBeenCalled();
  });
});
