import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClassRecordReportsPage } from './class-record-reports-page';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { dashboardService } from '@/services/dashboard-service';
import { reportService } from '@/services/report-service';
import { downloadReportPdf } from '@/utils/report-pdf';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getAll: jest.fn(),
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
    getClassEnrollment: jest.fn(),
    getStudentPerformance: jest.fn(),
    getInterventionParticipation: jest.fn(),
    getAssessmentSummary: jest.fn(),
    getSystemUsage: jest.fn(),
    exportCsv: jest.fn(),
  },
}));

jest.mock('@/utils/report-pdf', () => ({
  downloadReportPdf: jest.fn(),
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;
const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedReportService = reportService as jest.Mocked<typeof reportService>;
const mockedDownloadReportPdf = downloadReportPdf as jest.MockedFunction<typeof downloadReportPdf>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('ClassRecordReportsPage', () => {
  const createObjectURL = jest.fn(() => 'blob:admin-report');
  const revokeObjectURL = jest.fn();

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

    mockedClassService.getAll.mockResolvedValue({
      data: {
        data: [
          {
            id: 'class-1',
            subjectName: 'Mathematics',
            subjectCode: 'MATH-7',
            section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
          },
        ],
      },
    } as any);
    mockedDashboardService.getTeacherClasses.mockResolvedValue({
      data: [],
    } as any);
    mockedClassRecordService.getByClass.mockResolvedValue({
      data: [{ id: 'record-1', gradingPeriod: 'Q1', status: 'draft' }],
    } as any);
    mockedClassRecordService.getClassAverageReport.mockResolvedValue({
      data: { average: 91, count: 2, interventionCount: 0 },
    } as any);
    mockedClassRecordService.getDistributionReport.mockResolvedValue({
      data: { total: 0, distribution: {} },
    } as any);
    mockedClassRecordService.getInterventionReport.mockResolvedValue({
      data: [],
    } as any);
    mockedReportService.getStudentMasterList.mockResolvedValue({ data: [] } as any);
    mockedReportService.getClassEnrollment.mockResolvedValue({ data: [] } as any);
    mockedReportService.getStudentPerformance.mockResolvedValue({ data: [] } as any);
    mockedReportService.getInterventionParticipation.mockResolvedValue({ data: [] } as any);
    mockedReportService.getAssessmentSummary.mockResolvedValue({ data: [] } as any);
    mockedReportService.getSystemUsage.mockResolvedValue({ data: null } as any);
    mockedReportService.exportCsv.mockResolvedValue(new Blob(['csv']));
    mockedDownloadReportPdf.mockResolvedValue(undefined);
  });

  it('offers separate CSV and PDF export actions in the reports hub', async () => {
    render(
      <ClassRecordReportsPage
        heading="Reports"
        description="Admin reports"
        scope="admin"
      />,
    );

    const csvButton = await screen.findByRole('button', { name: /download csv/i });
    const pdfButton = screen.getByRole('button', { name: /download pdf/i });

    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockedDownloadReportPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          tab: 'classRecord',
        }),
      );
    });

    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockedReportService.exportCsv).toHaveBeenCalledWith(
        'classRecord',
        expect.objectContaining({
          classId: 'class-1',
          page: 1,
          limit: 200,
        }),
      );
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:admin-report');
    expect(mockedToast.success).toHaveBeenCalledWith('CSV report downloaded');
  });
});
