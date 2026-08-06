import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherClassDetailPage from './page';
import { getTrackedExtractionNotificationStorageKey } from '@/lib/extraction-notification-tracker';
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

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    status: 'authenticated',
    user: { id: 'teacher-1', roles: [{ name: 'teacher' }] },
    role: 'teacher',
    isProfileIncomplete: false,
    setUser: jest.fn(),
    refreshAuth: jest.fn(),
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
    cancel: jest.fn(),
    retry: jest.fn(),
    delete: jest.fn(),
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
    window.localStorage.clear();
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
              requestedSectionCount: 4,
              finalSectionCount: 4,
              reviewState: 'needs_review',
            },
          },
        },
        {
          id: 'extraction-2',
          originalName: 'Quarter 2 Module.pdf',
          extractionStatus: 'processing',
          qualityGate: null,
          reviewRequired: false,
          createdAt: '2026-04-30T00:05:00.000Z',
          structuredContent: {
            title: 'Forces and Motion',
            audit: {
              requestedSectionCount: 3,
              extractionStyle: 'faithful',
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
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText(/Requested sections: 4/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View/i })).toHaveAttribute(
      'href',
      '/dashboard/teacher/extractions/extraction-1',
    );

    fireEvent.click(screen.getByRole('button', { name: /Drop a PDF here to extract module/i }));
    expect(mockedFileService.upload).not.toHaveBeenCalled();
    expect(mockedExtractionService.extractModule).not.toHaveBeenCalled();
  });

  it('shows a delete action beside view and removes the extraction after confirmation', async () => {
    mockedExtractionService.delete.mockResolvedValue({
      success: true,
      message: 'deleted',
    } as Awaited<ReturnType<typeof extractionService.delete>>);

    render(<TeacherClassDetailPage />);

    expect(await screen.findByText('Cells and Systems')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete Cells and Systems/i }));

    expect(
      await screen.findByRole('heading', { name: 'Delete Extraction' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Extraction' }));

    expect(mockedExtractionService.delete).toHaveBeenCalledWith('extraction-1');
  });

  it('defaults the section target to 4 and sends the selected value when queueing extraction', async () => {
    mockedFileService.upload.mockResolvedValue({
      data: { id: 'file-uploaded-1' },
    } as Awaited<ReturnType<typeof fileService.upload>>);
    mockedExtractionService.extractModule.mockResolvedValue({
      success: true,
      message: 'queued',
      data: { extractionId: 'extract-new', status: 'pending' },
    } as Awaited<ReturnType<typeof extractionService.extractModule>>);

    render(<TeacherClassDetailPage />);

    expect(await screen.findByText('Cells and Systems')).toBeInTheDocument();

    const selector = screen.getByRole('combobox', { name: 'Target section count' });
    expect(selector).toHaveValue('4');

    fireEvent.change(selector, { target: { value: '5' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Extraction style' }), {
      target: { value: 'student_friendly' },
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['module'], 'module.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockedExtractionService.extractModule).toHaveBeenCalledWith({
        fileId: 'file-uploaded-1',
        targetSectionCount: 5,
        extractionStyle: 'student_friendly',
      });
    });

    const tracked = JSON.parse(
      window.localStorage.getItem(getTrackedExtractionNotificationStorageKey(classId)) || '[]',
    );
    expect(tracked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extractionId: 'extract-new',
          classId,
          originalName: 'module.pdf',
          targetSectionCount: 5,
          extractionStyle: 'student_friendly',
          lastKnownStatus: 'pending',
        }),
      ]),
    );
  });

  it('shows extraction style in history and supports retry and cancel actions', async () => {
    mockedExtractionService.retry.mockResolvedValue({
      success: true,
      message: 'retry queued',
      data: { extractionId: 'retry-1', status: 'pending' },
    } as Awaited<ReturnType<typeof extractionService.retry>>);
    mockedExtractionService.cancel.mockResolvedValue({
      success: true,
      message: 'cancelled',
      data: { id: 'extraction-2', status: 'failed' },
    } as Awaited<ReturnType<typeof extractionService.cancel>>);

    render(<TeacherClassDetailPage />);

    expect(await screen.findByText('Cells and Systems')).toBeInTheDocument();
    expect(screen.getByText(/Style: faithful/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry Cells and Systems/i }));
    await waitFor(() => {
      expect(mockedExtractionService.retry).toHaveBeenCalledWith('extraction-1', {
        extractionStyle: 'clean',
        targetSectionCount: 4,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel Forces and Motion/i }));
    await waitFor(() => {
      expect(mockedExtractionService.cancel).toHaveBeenCalledWith('extraction-2');
    });
  });
});
