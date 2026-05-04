import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentCoursesPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByStudent: jest.fn(),
    getStudentPresentationPreferences: jest.fn(),
    getStudentCourseViewPreference: jest.fn(),
    setStudentCourseViewPreference: jest.fn(),
    updateStudentPresentation: jest.fn(),
    hide: jest.fn(),
    unhide: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getCompletedByClass: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;

describe('StudentCoursesPage guide', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'student-1',
        firstName: 'Jamie',
        lastName: 'Cruz',
      },
    } as ReturnType<typeof useAuth>);

    mockedClassService.getByStudent.mockImplementation(async (_userId, visibility) => ({
      success: true,
      message: 'ok',
      data:
        visibility === 'hidden'
          ? [
              {
                id: 'class-hidden',
                subjectName: 'Science 7',
                subjectCode: 'SCI-7',
                isActive: true,
                section: { id: 'section-1', name: 'Section B', gradeLevel: '7' },
                teacher: { id: 'teacher-2', firstName: 'Ana', lastName: 'Lopez' },
                enrollments: [],
              },
            ]
          : [
              {
                id: 'class-active',
                subjectName: 'Mathematics 7',
                subjectCode: 'MATH-7',
                isActive: true,
                section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
                teacher: { id: 'teacher-1', firstName: 'Maria', lastName: 'Cruz' },
                enrollments: [],
              },
            ],
    }));

    mockedClassService.getStudentPresentationPreferences.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    mockedClassService.getStudentCourseViewPreference.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { viewMode: 'card' },
    });

    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    mockedLessonService.getCompletedByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-1',
          title: 'Algebra Quiz',
          dueDate: '2026-05-15T08:00:00.000Z',
        },
      ],
    });

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'announcement-1',
          title: 'Room Reminder',
          content: 'Science room update',
          createdAt: '2026-05-15T07:00:00.000Z',
        },
      ],
    });
  });

  it('opens the student help guide, walks through every page, and closes it', async () => {
    render(<StudentCoursesPage />);

    await screen.findByText('Mathematics 7');
    fireEvent.click(screen.getByRole('button', { name: /my classes help/i }));

    expect(await screen.findByText('Student guide: My Classes')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Start here and find the class you need')).toBeInTheDocument();
    expect(screen.getByText('Page tools')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('Read the class card before you open it')).toBeInTheDocument();
    expect(screen.getByText('Status badge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
    expect(screen.getByText('Use the class buttons for the next step')).toBeInTheDocument();
    expect(screen.getAllByText('Continue Learning')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 4 of 5')).toBeInTheDocument();
    expect(screen.getByText('Arrange the page the way you like it')).toBeInTheDocument();
    expect(screen.getByText('Hidden list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 5 of 5')).toBeInTheDocument();
    expect(screen.getByText('Use the calendar and event list on the side')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Event list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText('Page 4 of 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close guide/i }));
    await waitFor(() => {
      expect(screen.queryByText('Student guide: My Classes')).not.toBeInTheDocument();
    });
  });
});
