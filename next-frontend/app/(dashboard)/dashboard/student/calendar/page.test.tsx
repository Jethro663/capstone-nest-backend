import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentCalendarPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';

let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByStudent: jest.fn(),
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

jest.mock('@/services/school-event-service', () => ({
  schoolEventService: {
    getAll: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedSchoolEventService = schoolEventService as jest.Mocked<typeof schoolEventService>;

describe('StudentCalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T08:00:00.000Z'));

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'student-1',
        roles: ['student'],
      },
    } as ReturnType<typeof useAuth>);

    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: '',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          section: {
            id: 'section-1',
            name: 'Ruby',
            gradeLevel: '7',
          },
          schedules: [
            {
              id: 'sched-1',
              days: ['F'],
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: '',
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Fractions Quiz',
          description: 'Bring scratch paper.',
          dueDate: '2026-05-01T09:00:00.000Z',
          isPublished: true,
        },
      ],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: '',
      data: [
        {
          id: 'announcement-1',
          classId: 'class-1',
          title: 'Quiz room update',
          content: '<p>Room changed to Lab 2.</p>',
          isPinned: false,
          isArchived: false,
          createdAt: '2026-05-01T07:00:00.000Z',
        },
      ],
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);

    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: '',
      data: [
        {
          id: 'event-1',
          eventType: 'school_event',
          schoolYear: '2025-2026',
          title: 'Foundation Day Program',
          description: 'Assembly at the gym.',
          startsAt: '2026-05-01T00:00:00.000Z',
          endsAt: '2026-05-01T12:00:00.000Z',
          allDay: false,
        },
      ],
    } as Awaited<ReturnType<typeof schoolEventService.getAll>>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows student calendar feed details for the selected date and supports class filtering', async () => {
    render(<StudentCalendarPage />);

    expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    expect(
      screen.getByText('Click a date to inspect every item scheduled for that day.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Selected Date')).toBeInTheDocument();
    expect(screen.getAllByText('Fractions Quiz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quiz room update').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foundation Day Program').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mathematics 7').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Filter calendar by class'), {
      target: { value: 'class-1' },
    });

    expect(screen.getByDisplayValue('Mathematics 7')).toBeInTheDocument();
  });

  it('shows a safe class-list error and retries only the class owner request', async () => {
    mockedClassService.getByStudent.mockRejectedValueOnce(
      new Error('class relation detail'),
    );

    render(<StudentCalendarPage />);

    expect(
      await screen.findByText("Calendar couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('No events yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('class relation detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    expect(mockedClassService.getByStudent).toHaveBeenCalledTimes(4);
  });

  it('keeps fulfilled calendar sources visible and retries only a failed feed', async () => {
    mockedAssessmentService.getByClass.mockRejectedValueOnce(
      new Error('assessment feed detail'),
    );

    render(<StudentCalendarPage />);

    expect(
      await screen.findByText("Some calendar items couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Quiz room update').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foundation Day Program').length).toBeGreaterThan(0);
    expect(screen.queryByText('No events yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('assessment feed detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry calendar items/i }));

    expect((await screen.findAllByText('Fractions Quiz')).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(mockedAssessmentService.getByClass).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByText("Some calendar items couldn't be loaded"),
      ).not.toBeInTheDocument();
    });
    expect(mockedAnnouncementService.getByClass).toHaveBeenCalledTimes(1);
    expect(mockedSchoolEventService.getAll).toHaveBeenCalledTimes(1);
  });

  it('shows a true no-events state only after every feed succeeds', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: '',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          schedules: [],
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);
    mockedAssessmentService.getByClass.mockResolvedValueOnce({
      success: true,
      message: '',
      data: [],
      count: 0,
      total: 0,
      page: 1,
      limit: 120,
      totalPages: 0,
    });
    mockedAnnouncementService.getByClass.mockResolvedValueOnce({
      success: true,
      message: '',
      data: [],
    });
    mockedSchoolEventService.getAll.mockResolvedValueOnce({
      success: true,
      message: '',
      data: [],
    });

    render(<StudentCalendarPage />);

    expect(await screen.findByText('No events yet.')).toBeInTheDocument();
    expect(
      screen.queryByText("Some calendar items couldn't be loaded"),
    ).not.toBeInTheDocument();
  });

  it('renders the URL-driven upcoming view with ten items per page and URL pagination', async () => {
    mockSearchParams = new URLSearchParams('view=upcoming&page=2');
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: '',
      data: Array.from({ length: 11 }, (_, index) => {
        const day = String(index + 2).padStart(2, '0');
        return {
          id: `event-${index + 1}`,
          eventType: 'school_event' as const,
          schoolYear: '2025-2026',
          title: `Upcoming Event ${index + 1}`,
          startsAt: `2026-05-${day}T08:00:00.000Z`,
          endsAt: `2026-05-${day}T12:00:00.000Z`,
          allDay: false,
        };
      }),
    });

    render(<StudentCalendarPage />);

    expect(await screen.findByRole('heading', { name: 'Upcoming' })).toBeInTheDocument();
    expect(screen.getByText('Upcoming Event 11')).toBeInTheDocument();
    expect(screen.queryByText('Upcoming Event 10')).not.toBeInTheDocument();
    expect(screen.queryByText('Quiz room update')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/dashboard/student/calendar?view=upcoming&page=1',
    );
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Month view' })).toHaveAttribute(
      'href',
      '/dashboard/student/calendar',
    );
  });
});
