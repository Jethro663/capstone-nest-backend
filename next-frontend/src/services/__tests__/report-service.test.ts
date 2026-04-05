import { reportService } from '@/services/report-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('reportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests each report endpoint with query params', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: [], filters: {}, generatedAt: '2026-04-04T00:00:00.000Z' },
    });

    const query = { classId: 'class-1', page: 2, limit: 20 };

    await reportService.getStudentMasterList(query);
    await reportService.getClassEnrollment(query);
    await reportService.getStudentPerformance(query);
    await reportService.getInterventionParticipation(query);
    await reportService.getAssessmentSummary(query);
    await reportService.getSystemUsage(query);

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/reports/student-master-list', { params: query });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/reports/class-enrollment', { params: query });
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/reports/student-performance', { params: query });
    expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/reports/intervention-participation', { params: query });
    expect(mockedApi.get).toHaveBeenNthCalledWith(5, '/reports/assessment-summary', { params: query });
    expect(mockedApi.get).toHaveBeenNthCalledWith(6, '/reports/system-usage', { params: query });
  });
});
