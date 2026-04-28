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

  it('downloads CSV reports through the authenticated API client', async () => {
    const blob = new Blob(['csv']);
    mockedApi.get.mockResolvedValue({ data: blob });

    const result = await reportService.exportCsv('studentMasterList', {
      classId: 'class-1',
      dateFrom: '2026-03-01',
    });

    expect(result).toBe(blob);
    expect(mockedApi.get).toHaveBeenCalledWith('/reports/student-master-list', {
      params: {
        classId: 'class-1',
        dateFrom: '2026-03-01',
        export: 'csv',
      },
      responseType: 'blob',
    });
  });
});
