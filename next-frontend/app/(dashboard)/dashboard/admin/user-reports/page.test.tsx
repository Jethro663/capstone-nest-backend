'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUserReportsPage from './page';
import {
  userService,
  type UserMonitoringReportResponse,
} from '@/services/user-service';

jest.mock('@/services/user-service', () => ({
  userService: { getMonitoringReport: jest.fn() },
}));

const mockedUserService = jest.mocked(userService);

function reportResponse(
  page: number,
  id: string,
  firstName: string,
): UserMonitoringReportResponse {
  return {
    success: true,
    message: 'ok',
    data: {
      data: [
        {
          id,
          email: `${firstName.toLowerCase()}@nexora.edu`,
          firstName,
          lastName: 'Santos',
          roles: ['teacher'],
          status: 'ACTIVE',
          isEmailVerified: true,
          lastLoginAt: '2026-09-27T01:00:00.000Z',
          lastLogoutAt: '2026-09-27T02:00:00.000Z',
          lastActivityAt: '2026-09-27T02:00:00.000Z',
          activityIp: '192.168.1.10',
          inactiveFor: '1h',
          isCurrentlyActive: false,
          isSuspended: false,
          isArchived: false,
        },
      ],
      total: 25,
      page,
      limit: 20,
      totalPages: 2,
    },
  };
}

describe('AdminUserReportsPage pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getMonitoringReport
      .mockResolvedValueOnce(reportResponse(1, 'report-1', 'Alex'))
      .mockResolvedValueOnce(reportResponse(2, 'report-2', 'Jamie'))
      .mockResolvedValueOnce(reportResponse(1, 'report-3', 'Jordan'));
  });

  it('uses the nested backend pagination envelope and server search', async () => {
    render(<AdminUserReportsPage />);

    expect(await screen.findByText('Alex Santos')).toBeInTheDocument();
    expect(mockedUserService.getMonitoringReport).toHaveBeenNthCalledWith(1, {
      status: undefined,
      role: undefined,
      page: 1,
      limit: 20,
      search: undefined,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Jamie Santos')).toBeInTheDocument();
    expect(mockedUserService.getMonitoringReport).toHaveBeenNthCalledWith(2, {
      status: undefined,
      role: undefined,
      page: 2,
      limit: 20,
      search: undefined,
    });

    fireEvent.change(
      screen.getByPlaceholderText('Search by name, email, or role...'),
      { target: { value: 'Jordan' } },
    );

    await waitFor(() =>
      expect(mockedUserService.getMonitoringReport).toHaveBeenNthCalledWith(3, {
        status: undefined,
        role: undefined,
        page: 1,
        limit: 20,
        search: 'Jordan',
      }),
    );
    expect(await screen.findByText('Jordan Santos')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–20 of 25 users')).toBeInTheDocument();
  });
});
