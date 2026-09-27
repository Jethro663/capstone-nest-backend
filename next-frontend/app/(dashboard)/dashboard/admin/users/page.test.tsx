'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManagementPage from './page';
import { userService, type UsersListResponse } from '@/services/user-service';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn() }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'admin-current' } }),
}));

jest.mock('@/services/user-service', () => ({
  userService: {
    getAll: jest.fn(),
    bulkLifecycle: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    softDelete: jest.fn(),
    exportUser: jest.fn(),
  },
}));

jest.mock('@/services/admin-lifecycle-service', () => ({
  adminLifecycleService: {
    previewPurgeBatch: jest.fn(),
    executePurgeBatch: jest.fn(),
  },
}));

jest.mock('@/components/admin/AdminErasureBatchDialog', () => ({
  AdminErasureBatchDialog: () => null,
}));

const mockedUserService = jest.mocked(userService);

function usersResponse(
  page: number,
  id: string,
  firstName: string,
): UsersListResponse {
  return {
    success: true,
    users: [
      {
        id,
        email: `${firstName.toLowerCase()}@nexora.edu`,
        firstName,
        lastName: 'Cruz',
        roles: ['student'],
        status: 'ACTIVE',
        isEmailVerified: true,
        gradeLevel: '7',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ],
    page,
    limit: 20,
    total: 25,
    totalPages: 2,
    statusCounts: {
      ACTIVE: 25,
      PENDING: 0,
      SUSPENDED: 0,
      DELETED: 0,
    },
  };
}

describe('UserManagementPage pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getAll
      .mockResolvedValueOnce(usersResponse(1, 'user-1', 'Alex'))
      .mockResolvedValueOnce(usersResponse(2, 'user-2', 'Jamie'))
      .mockResolvedValueOnce(usersResponse(1, 'user-3', 'Jordan'));
  });

  it('uses backend pages and resets to page one for server search', async () => {
    render(<UserManagementPage />);

    expect(await screen.findByText('Alex Cruz')).toBeInTheDocument();
    expect(mockedUserService.getAll).toHaveBeenNthCalledWith(1, {
      status: 'ACTIVE',
      role: undefined,
      gradeLevel: undefined,
      page: 1,
      limit: 20,
      search: undefined,
      includeStatusCounts: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Jamie Cruz')).toBeInTheDocument();
    expect(mockedUserService.getAll).toHaveBeenNthCalledWith(2, {
      status: 'ACTIVE',
      role: undefined,
      gradeLevel: undefined,
      page: 2,
      limit: 20,
      search: undefined,
      includeStatusCounts: true,
    });

    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'Jordan' },
    });

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenNthCalledWith(3, {
        status: 'ACTIVE',
        role: undefined,
        gradeLevel: undefined,
        page: 1,
        limit: 20,
        search: 'Jordan',
        includeStatusCounts: true,
      }),
    );
    expect(await screen.findByText('Jordan Cruz')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–20 of 25 users')).toBeInTheDocument();
  });
});
