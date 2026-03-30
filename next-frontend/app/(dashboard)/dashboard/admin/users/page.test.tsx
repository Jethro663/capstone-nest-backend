'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManagementPage from './page';
import { userService } from '@/services/user-service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
  }),
}));

jest.mock('@/services/user-service', () => ({
  userService: {
    getAll: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    softDelete: jest.fn(),
    purge: jest.fn(),
    exportUser: jest.fn(),
    bulkLifecycle: jest.fn(),
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

function buildResponse(query?: { status?: string; role?: string }) {
  const status = query?.status ?? 'ACTIVE';
  const users =
    query?.role === 'teacher'
      ? [
          {
            id: 'teacher-1',
            firstName: 'Tina',
            lastName: 'Teacher',
            email: 'teacher@example.com',
            roles: [{ id: 'role-2', name: 'teacher' }],
            status,
            isEmailVerified: true,
            createdAt: '2026-03-27T00:00:00.000Z',
            updatedAt: '2026-03-27T00:00:00.000Z',
          },
        ]
      : [
          {
            id: 'admin-1',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            roles: [{ id: 'role-1', name: 'admin' }],
            status,
            isEmailVerified: true,
            createdAt: '2026-03-27T00:00:00.000Z',
            updatedAt: '2026-03-27T00:00:00.000Z',
          },
          {
            id: `student-${status.toLowerCase()}`,
            firstName: 'Student',
            lastName: 'User',
            email: 'student@example.com',
            roles: [{ id: 'role-3', name: 'student' }],
            status,
            isEmailVerified: true,
            createdAt: '2026-03-27T00:00:00.000Z',
            updatedAt: '2026-03-27T00:00:00.000Z',
          },
        ];

  return {
    success: true,
    users: users as any,
    page: 1,
    limit: 100,
    total: users.length,
    totalPages: 1,
    statusCounts: {
      ACTIVE: 7,
      PENDING: 2,
      SUSPENDED: 1,
      DELETED: 4,
    },
  };
}

describe('UserManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushMock.mockReset();
    mockedUserService.getAll.mockImplementation(async (query) => buildResponse(query));
    mockedUserService.bulkLifecycle.mockResolvedValue({
      success: true,
      message: '1 user suspended.',
      data: {
        action: 'suspend',
        requested: 1,
        succeeded: ['student-active'],
        failed: [],
      },
    });
  });

  it('keeps the page shell mounted while tab changes refresh only the table region', async () => {
    let resolvePending!: (value: ReturnType<typeof buildResponse>) => void;
    mockedUserService.getAll
      .mockResolvedValueOnce(buildResponse({ status: 'ACTIVE' }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePending = resolve;
          }),
      );

    render(<UserManagementPage />);

    await screen.findByRole('heading', { name: 'Users' });
    expect(screen.getByText('7')).toBeInTheDocument();

    const pendingTab = screen.getByRole('tab', { name: /pending/i });
    fireEvent.mouseDown(pendingTab);
    fireEvent.click(pendingTab);

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Refreshing users...')).toBeInTheDocument();

    resolvePending(buildResponse({ status: 'PENDING' }));

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: 'PENDING',
        role: undefined,
        limit: 100,
        includeStatusCounts: true,
      }),
    );
  });

  it('applies the role filter through the filter menu and refetches the table', async () => {
    render(<UserManagementPage />);

    await screen.findByRole('heading', { name: 'Users' });

    fireEvent.change(screen.getByLabelText(/filter users by role/i), {
      target: { value: 'teacher' },
    });

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: 'ACTIVE',
        role: 'teacher',
        limit: 100,
        includeStatusCounts: true,
      }),
    );
    expect(screen.getByLabelText(/filter users by role/i)).toHaveValue('teacher');
  });

  it('navigates on row-body click and bulk-select excludes the current admin account', async () => {
    render(<UserManagementPage />);

    await screen.findByRole('heading', { name: 'Users' });

    fireEvent.click(screen.getByText('student@example.com'));
    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/users/student-active');

    fireEvent.click(screen.getByRole('button', { name: /select all visible/i }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /suspend selected/i }));
    fireEvent.click(await screen.findByRole('button', { name: /suspend users/i }));

    await waitFor(() =>
      expect(mockedUserService.bulkLifecycle).toHaveBeenCalledWith({
        action: 'suspend',
        userIds: ['student-active'],
      }),
    );
  });
});
