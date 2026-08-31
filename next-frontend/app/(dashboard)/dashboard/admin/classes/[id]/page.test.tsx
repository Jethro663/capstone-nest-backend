import { render, screen } from '@testing-library/react';
import AdminClassDetailPage from './page';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { discussionBoardService } from '@/services/discussion-board-service';
import { extractionService } from '@/services/extraction-service';
import { moduleService } from '@/services/module-service';

let currentView: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1' }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'view' ? currentView : null),
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
    getEnrollments: jest.fn(),
    update: jest.fn(),
    toggleStatus: jest.fn(),
    hide: jest.fn(),
    unhide: jest.fn(),
    unenrollStudent: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
    releaseCoreModule: jest.fn(),
    reorderByClass: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
    releaseCore: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    listByClass: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    releaseCore: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    listThreads: jest.fn(),
    getThread: jest.fn(),
    archiveThread: jest.fn(),
    publishThread: jest.fn(),
    closeThread: jest.fn(),
    reopenThread: jest.fn(),
    deleteComment: jest.fn(),
    reportComment: jest.fn(),
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedExtractionService = extractionService as jest.Mocked<
  typeof extractionService
>;
const mockedAnnouncementService = announcementService as jest.Mocked<
  typeof announcementService
>;
const mockedClassRecordService = classRecordService as jest.Mocked<
  typeof classRecordService
>;
const mockedDiscussionBoardService = discussionBoardService as jest.Mocked<
  typeof discussionBoardService
>;

describe('AdminClassDetailPage', () => {
  beforeEach(() => {
    currentView = null;
    jest.clearAllMocks();

    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics 9',
        subjectCode: 'MATH-9',
        subjectGradeLevel: '9',
        sectionId: 'section-1',
        section: { id: 'section-1', name: 'Section A', gradeLevel: '9' },
        teacherId: 'teacher-1',
        teacher: { id: 'teacher-1', firstName: 'Ana', lastName: 'Reyes' },
        schoolYear: '2026-2027',
        room: '402',
        isActive: true,
        isHidden: false,
        schedules: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);

    mockedClassService.getEnrollments.mockResolvedValue({
      data: [
        {
          id: 'enrollment-1',
          studentId: 'student-1',
          classId: 'class-1',
          student: {
            id: 'student-1',
            firstName: 'Jose',
            lastName: 'Santos',
            email: 'jose@example.com',
          },
        },
      ],
      count: 1,
    } as Awaited<ReturnType<typeof classService.getEnrollments>>);

    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      count: 1,
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Numbers and Operations',
          description: 'Module summary',
          order: 1,
          isVisible: true,
          isLocked: false,
          sections: [],
          gradingScaleEntries: [],
        },
      ],
    } as Awaited<ReturnType<typeof moduleService.getByClass>>);

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      count: 1,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Weekly Quiz',
          type: 'quiz',
          isPublished: false,
          questions: [],
        },
      ],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);

    mockedExtractionService.listByClass.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      data: [],
    } as Awaited<ReturnType<typeof extractionService.listByClass>>);

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      data: [],
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);

    mockedClassRecordService.getByClass.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof classRecordService.getByClass>>);

    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      success: true,
      message: 'Fixture response',
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);
  });

  it('falls back to modules when the query param is invalid', async () => {
    currentView = 'not-real';

    render(<AdminClassDetailPage />);

    expect(await screen.findByText('Mathematics 9')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Modules' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Numbers and Operations')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Back to Classes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Add Class Students/i }),
    ).toHaveAttribute('href', '/dashboard/admin/classes/class-1/students/add');
  });

  it('renders the calendar workspace when view=calendar', async () => {
    currentView = 'calendar';

    render(<AdminClassDetailPage />);

    expect(await screen.findByText('Mathematics 9')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Calendar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No scheduled class events yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Full Calendar/i }),
    ).toBeInTheDocument();
  });
});
