'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuditLogPage } from './audit-log-page';
import { adminService } from '@/services/admin-service';

jest.mock('@/services/admin-service', () => ({
  adminService: {
    getAuditLogs: jest.fn(),
    getActivityExportUrl: jest.fn(() => '/api/admin/activity-export'),
  },
}));

const mockedAdminService = adminService as jest.Mocked<typeof adminService>;
type AuditLogsResponse = Awaited<ReturnType<typeof adminService.getAuditLogs>>;

describe('AuditLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminService.getAuditLogs.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'log-1',
          actorId: 'actor-1',
          action: 'Created user account',
          targetType: 'user',
          targetId: 'user-1',
          metadata: { targetLabel: 'Jamie Cruz (student)', ip: '192.168.1.10' },
          createdAt: '2026-03-27T09:00:00.000Z',
          actor: {
            id: 'actor-1',
            firstName: 'Alex',
            lastName: 'Rivera',
            email: 'alex@nexora.edu',
          },
        },
      ],
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
    } as AuditLogsResponse);
  });

  it('renders mapped audit columns and supports search filtering', async () => {
    render(<AuditLogPage />);

    expect((await screen.findAllByText('Alex Rivera')).length).toBeGreaterThan(0);
    expect(screen.getByText('Jamie Cruz (student)')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(mockedAdminService.getAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      action: undefined,
      actorId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });

    fireEvent.change(screen.getByPlaceholderText('Search logs...'), {
      target: { value: 'non-matching-term' },
    });

    await waitFor(() =>
      expect(screen.getByText('No audit entries found')).toBeInTheDocument(),
    );
  });

  it('fetches the next audit page and resets to page 1 when filters change', async () => {
    mockedAdminService.getAuditLogs
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'log-1',
            actorId: 'actor-1',
            action: 'Created user account',
            targetType: 'user',
            targetId: 'user-1',
            metadata: { targetLabel: 'Jamie Cruz (student)', ip: '192.168.1.10' },
            createdAt: '2026-03-27T09:00:00.000Z',
            actor: {
              id: 'actor-1',
              firstName: 'Alex',
              lastName: 'Rivera',
              email: 'alex@nexora.edu',
            },
          },
        ],
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 2,
      } as AuditLogsResponse)
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'log-2',
            actorId: 'actor-2',
            action: 'Updated class record',
            targetType: 'class',
            targetId: 'class-1',
            metadata: { targetLabel: 'Grade 8 - Rizal', ip: '192.168.1.20' },
            createdAt: '2026-03-27T10:00:00.000Z',
            actor: {
              id: 'actor-2',
              firstName: 'Jamie',
              lastName: 'Santos',
              email: 'jamie@nexora.edu',
            },
          },
        ],
        page: 2,
        limit: 20,
        total: 2,
        totalPages: 2,
      } as AuditLogsResponse)
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'log-2',
            actorId: 'actor-2',
            action: 'Updated class record',
            targetType: 'class',
            targetId: 'class-1',
            metadata: { targetLabel: 'Grade 8 - Rizal', ip: '192.168.1.20' },
            createdAt: '2026-03-27T10:00:00.000Z',
            actor: {
              id: 'actor-2',
              firstName: 'Jamie',
              lastName: 'Santos',
              email: 'jamie@nexora.edu',
            },
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      } as AuditLogsResponse);

    render(<AuditLogPage />);

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(screen.getAllByText('Jamie Santos').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(mockedAdminService.getAuditLogs).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 20,
      action: undefined,
      actorId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });

    fireEvent.change(screen.getByDisplayValue('Actor'), {
      target: { value: 'actor-2' },
    });

    await waitFor(() =>
      expect(mockedAdminService.getAuditLogs).toHaveBeenNthCalledWith(3, {
        page: 1,
        limit: 20,
        action: undefined,
        actorId: 'actor-2',
        dateFrom: undefined,
        dateTo: undefined,
      }),
    );
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
