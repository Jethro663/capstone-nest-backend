'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManagementPage from './page';
import { userService } from '@/services/user-service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
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
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

describe('UserManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getAll.mockImplementation(async (query) => ({
      success: true,
      users: [
        {
          id: `user-${query?.status?.toLowerCase() ?? 'active'}`,
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          roles: [{ id: 'role-1', name: 'admin' }],
          status: query?.status ?? 'ACTIVE',
          isEmailVerified: true,
          createdAt: '2026-03-27T00:00:00.000Z',
          updatedAt: '2026-03-27T00:00:00.000Z',
        },
      ] as any,
      page: 1,
      limit: 200,
      total: 1,
      totalPages: 1,
      statusCounts: {
        ACTIVE: 7,
        PENDING: 2,
        SUSPENDED: 1,
        DELETED: 4,
      },
    }));
  });

  it('uses one list request per tab and populates tab badges from statusCounts', async () => {
    render(<UserManagementPage />);

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenCalledWith({
        status: 'ACTIVE',
        limit: 200,
        includeStatusCounts: true,
      }),
    );

    await screen.findByRole('heading', { name: 'Users' });
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    const pendingTab = screen.getByRole('tab', { name: /pending/i });
    fireEvent.mouseDown(pendingTab);
    fireEvent.click(pendingTab);

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: 'PENDING',
        limit: 200,
        includeStatusCounts: true,
      }),
    );

    expect(mockedUserService.getAll).toHaveBeenCalledTimes(2);
  });
});
