import { fireEvent, render, screen } from '@testing-library/react';
import TeacherClassDetailPage from './page';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { discussionBoardService } from '@/services/discussion-board-service';
import { extractionService } from '@/services/extraction-service';
import { fileService } from '@/services/file-service';
import { healthService } from '@/services/health-service';
import { moduleService } from '@/services/module-service';

const classId = '11111111-1111-4111-8111-111111111111';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: classId }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'view' ? 'extraction' : null),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/hooks/use-teacher-class-record', () => ({
  useTeacherClassRecord: () => ({
    loading: false,
    records: [],
  }),
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getFinalGrades: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
    getEnrollments: jest.fn(),
  },
}));

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    listThreads: jest.fn(),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    listByClass: jest.fn(),
    extractModule: jest.fn(),
  },
}));

jest.mock('@/services/file-service', () => ({
  fileService: {
    upload: jest.fn(),
  },
}));

jest.mock('@/services/health-service', () => ({
  healthService: {
    getReadiness: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
  },
}));

const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedDiscussionBoardService = discussionBoardService as jest.Mocked<typeof discussionBoardService>;
const mockedExtractionService = extractionService as jest.Mocked<typeof extractionService>;
const mockedFileService = fileService as jest.Mocked<typeof fileService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;

describe('TeacherClassDetailPage extraction view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedClassService.getById.mockResolvedValue({
      data: {
        id: classId,
        subjectName: 'Science',
        subjectCode: 'SCI-7',
        subjectGradeLevel: '7',
        room: '201',
        schedules: [],
        section: {
          name: 'Rizal',
          gradeLevel: '7',
        },
        enrollments: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);
    mockedClassService.getEnrollments.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof classService.getEnrollments>>);
    mockedModuleService.getByClass.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof moduleService.getByClass>>);
    mockedAssessmentService.getByClass.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedExtractionService.listByClass.mockResolvedValue({
      data: [
        {
          id: 'extraction-1',
          originalName: 'Quarter 1 Module.pdf',
          extractionStatus: 'completed',
          qualityGate: 'warn',
          reviewRequired: true,
          createdAt: '2026-04-30T00:00:00.000Z',
          structuredContent: {
            title: 'Cells and Systems',
            audit: {
              imageAssignmentSummary: { assigned: 1, unassigned: 1 },
            },
          },
        },
      ],
    } as Awaited<ReturnType<typeof extractionService.listByClass>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof announcementService.getByClass>>);
    mockedClassRecordService.getByClass.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof classRecordService.getByClass>>);
    mockedClassRecordService.getFinalGrades.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof classRecordService.getFinalGrades>>);
    mockedDiscussionBoardService.listThreads.mockResolvedValue({ data: [] } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);
  });

  it('shows the AI outage rail, disables PDF extraction upload, and keeps extraction history readable', async () => {
    mockedHealthService.getReadiness.mockResolvedValueOnce({
      ready: false,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: false, message: 'AI service returned HTTP 503' },
      },
    });

    render(<TeacherClassDetailPage />);

    expect(await screen.findByText(/AI tools are paused/i)).toBeInTheDocument();
    expect(screen.getByText(/AI service returned HTTP 503/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Drop a PDF here to extract module/i })).toBeDisabled();
    expect(screen.getByText('Cells and Systems')).toBeInTheDocument();
    expect(screen.getByText('Images unassigned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View/i })).toHaveAttribute(
      'href',
      '/dashboard/teacher/extractions/extraction-1',
    );

    fireEvent.click(screen.getByRole('button', { name: /Drop a PDF here to extract module/i }));
    expect(mockedFileService.upload).not.toHaveBeenCalled();
    expect(mockedExtractionService.extractModule).not.toHaveBeenCalled();
  });
});
