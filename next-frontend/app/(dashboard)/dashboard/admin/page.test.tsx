'use client';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDashboardPage from './page';
import { adminService } from '@/services/admin-service';
import { analyticsService } from '@/services/analytics-service';

jest.mock('@/services/admin-service', () => ({
  adminService: {
    getOverview: jest.fn(),
  },
}));

jest.mock('@/services/analytics-service', () => ({
  analyticsService: {
    getAdminOverview: jest.fn(),
  },
}));

const mockedAdminService = adminService as jest.Mocked<typeof adminService>;
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    mockedAdminService.getOverview.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        stats: {
          totalUsers: 12,
          totalStudents: 8,
          totalTeachers: 3,
          totalAdmins: 1,
          totalClasses: 5,
          totalSections: 4,
          activeClasses: 3,
          totalEnrollments: 18,
          fetchedAt: '2026-03-27T00:00:00.000Z',
        },
        usageSummary: {
          activeTeachers: 2,
          activeStudents: 6,
          assessmentSubmissions: 10,
          lessonCompletions: 7,
          interventionOpens: 1,
          interventionClosures: 1,
          topActions: [],
          generatedAt: '2026-03-27T00:00:00.000Z',
          csv: '',
        },
        analyticsOverview: {
          totals: {
            teachers: 3,
            students: 8,
            classes: 5,
            activeInterventions: 1,
            atRiskStudents: 2,
          },
          action: 'monitor',
        },
        readiness: {
          ready: true,
          timestamp: '2026-03-27T00:00:00.000Z',
          dependencies: {
            database: { ok: true },
            redis: { ok: true },
            aiService: { ok: true },
          },
        },
        fetchedAt: '2026-03-27T00:00:00.000Z',
      },
    } as Awaited<ReturnType<typeof adminService.getOverview>>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the admin overview without calling the old analytics endpoint and supports forced refresh', async () => {
    render(<AdminDashboardPage />);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() =>
      expect(mockedAdminService.getOverview).toHaveBeenCalledWith({
        force: undefined,
      }),
    );

    expect(mockedAnalyticsService.getAdminOverview).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('heading', { name: 'Admin Dashboard' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() =>
      expect(mockedAdminService.getOverview).toHaveBeenLastCalledWith({
        force: true,
      }),
    );
  });
});
