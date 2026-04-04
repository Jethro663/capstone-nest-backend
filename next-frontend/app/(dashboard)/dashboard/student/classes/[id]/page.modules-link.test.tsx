import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentClassDetailPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1' }),
  useSearchParams: () => ({ get: (key: string) => (key === 'view' ? 'modules' : null) }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children }: { children: ReactNode }) => <section>{children}</section>,
    article: ({ children }: { children: ReactNode }) => <article>{children}</article>,
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
    getByStudent: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
    getStudentAttempts: jest.fn(),
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/school-event-service', () => ({
  schoolEventService: {
    getAll: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedSchoolEventService = schoolEventService as jest.Mocked<typeof schoolEventService>;

describe('StudentClassDetailPage module links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: 'student-1', firstName: 'Jamie', lastName: 'Cruz' },
    } as ReturnType<typeof useAuth>);

    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        schoolYear: '2025-2026',
        section: { id: 'section-1', name: 'Rizal', gradeLevel: '10' },
        teacher: { id: 'teacher-1', firstName: 'Jamie', lastName: 'Cruz' },
        enrollments: [],
        schedules: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);

    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Module One',
          description: 'Desc',
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
      message: 'ok',
      data: [],
      count: 0,
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    } as Awaited<ReturnType<typeof schoolEventService.getAll>>);
  });

  it('routes module card open link to student module detail page', async () => {
    render(<StudentClassDetailPage />);

    const openLink = await screen.findByRole('link', { name: 'Open' });
    expect(openLink).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1/modules/module-1',
    );

    const bodyLink = await screen.findByRole('link', { name: 'Open Module One module' });
    expect(bodyLink).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1/modules/module-1',
    );
  });

  it('supports module card and long-card view switch with persistence', async () => {
    render(<StudentClassDetailPage />);

    const gridButton = await screen.findByRole('button', { name: 'Grid View' });
    const wideButton = await screen.findByRole('button', { name: 'Wide Card View' });

    expect(wideButton).toHaveAttribute('data-active', 'true');
    fireEvent.click(gridButton);

    expect(gridButton).toHaveAttribute('data-active', 'true');
    expect(window.localStorage.getItem('nexora.student.class.modules.view.class-1')).toBe(
      'card',
    );
  });
});
