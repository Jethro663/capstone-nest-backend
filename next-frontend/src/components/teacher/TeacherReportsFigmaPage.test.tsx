'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherReportsFigmaPage } from './TeacherReportsFigmaPage';
import { classRecordService } from '@/services/class-record-service';
import { dashboardService } from '@/services/dashboard-service';
import { reportService } from '@/services/report-service';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/dashboard-service', () => ({
  dashboardService: {
    getTeacherClasses: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getClassAverageReport: jest.fn(),
    getDistributionReport: jest.fn(),
    getInterventionReport: jest.fn(),
  },
}));

jest.mock('@/services/report-service', () => ({
  reportService: {
    getStudentMasterList: jest.fn(),
    getStudentPerformance: jest.fn(),
    exportCsv: jest.fn(),
  },
}));

const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;
const mockedReportService = reportService as jest.Mocked<typeof reportService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('TeacherReportsFigmaPage', () => {
  const createObjectURL = jest.fn(() => 'blob:teacher-report');
  const revokeObjectURL = jest.fn();
  const openSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.URL, 'createObjectURL', {
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      writable: true,
      value: revokeObjectURL,
    });
    window.open = openSpy;

    mockedDashboardService.getTeacherClasses.mockResolvedValue({
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
        },
      ],
    } as any);
    mockedClassRecordService.getByClass.mockResolvedValue({
      data: [{ id: 'record-1', gradingPeriod: 'Q1', status: 'draft' }],
    } as any);
    mockedClassRecordService.getClassAverageReport.mockResolvedValue({
      data: { average: 88, count: 2, interventionCount: 0 },
    } as any);
    mockedClassRecordService.getDistributionReport.mockResolvedValue({
      data: { buckets: [] },
    } as any);
    mockedClassRecordService.getInterventionReport.mockResolvedValue({
      data: [],
    } as any);
    mockedReportService.getStudentMasterList.mockResolvedValue({
      data: [],
    } as any);
    mockedReportService.getStudentPerformance.mockResolvedValue({
      data: [],
    } as any);
    mockedReportService.exportCsv.mockResolvedValue(new Blob(['csv']));
  });

  it('downloads teacher report CSV through the authenticated report service', async () => {
    render(<TeacherReportsFigmaPage />);

    const exportButton = await screen.findByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockedReportService.exportCsv).toHaveBeenCalledWith(
        'studentMasterList',
        expect.objectContaining({
          classId: 'class-1',
          page: 1,
          limit: 200,
        }),
      );
    });

    expect(window.open).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:teacher-report');
    expect(mockedToast.success).toHaveBeenCalledWith('CSV report downloaded');
  });
});
