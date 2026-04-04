import { analyticsService } from '@/services/analytics-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('analyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls class analytics endpoints with expected class IDs', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: {} } });

    await analyticsService.getInterventionOutcomes('class-1');
    await analyticsService.getClassTrends('class-1');

    expect(mockedApi.get).toHaveBeenNthCalledWith(
      1,
      '/analytics/classes/class-1/intervention-outcomes',
    );
    expect(mockedApi.get).toHaveBeenNthCalledWith(
      2,
      '/analytics/classes/class-1/trends',
    );
  });

  it('calls teacher and admin analytics endpoints', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: {} } });

    await analyticsService.getTeacherWorkload('teacher-1');
    await analyticsService.getAdminOverview();

    expect(mockedApi.get).toHaveBeenNthCalledWith(
      1,
      '/analytics/teachers/teacher-1/workload',
    );
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/analytics/admin/overview');
  });
});
