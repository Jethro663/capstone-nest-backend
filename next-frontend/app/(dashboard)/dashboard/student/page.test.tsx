'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentDashboardPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByStudent: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getByClass: jest.fn(),
    getRecent: jest.fn(),
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
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedSchoolEventService = schoolEventService as jest.Mocked<typeof schoolEventService>;

describe('StudentDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'student-1',
        firstName: 'Jamie',
        lastName: 'Cruz',
      },
    } as ReturnType<typeof useAuth>);
    mockedLessonService.getRecent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    });
  });

  it('renders pending tasks and recent lessons first without the old summary panels', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          section: { id: 'section-1', name: 'Rizal', gradeLevel: 'Grade 10' },
          teacher: { id: 'teacher-1', firstName: 'Lopez', lastName: 'Santos' },
          schedules: [
            {
              id: 'sched-1',
              days: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'],
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        },
      ],
    });

    mockedLessonService.getRecent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-1',
          classId: 'class-1',
          moduleId: 'module-1',
          title: 'Linear Equations',
          order: 1,
          updatedAt: '2026-08-29T04:00:00.000Z',
        },
      ],
      count: 1,
    });

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Algebra Quiz',
          type: 'assignment',
          isPublished: true,
          dueDate: '2026-06-18T00:00:00.000Z',
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    });

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'ann-1',
          classId: 'class-1',
          title: 'Science Fair Prep',
          content: 'Bring your project materials this Friday.',
          isPinned: false,
          isArchived: false,
          createdAt: '2026-04-03T00:00:00.000Z',
        },
      ],
    });

    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'event-1',
          eventType: 'holiday_break',
          schoolYear: '2025-2026',
          title: 'Midyear Break',
          startsAt: '2026-04-15T00:00:00.000Z',
          endsAt: '2026-04-18T00:00:00.000Z',
          allDay: true,
        },
      ],
    });

    render(<StudentDashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Your Learning Hub' })).toBeInTheDocument();

    expect(screen.queryByText('Enrolled Classes')).not.toBeInTheDocument();
    expect(screen.queryByText('Ready Lessons')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile Ready')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "Today's Learning Rhythm" })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Keep Exploring' })).not.toBeInTheDocument();

    const mainGrid = document.querySelector('.student-v2-grid');
    expect(mainGrid).toBeInTheDocument();

    const mainSections = Array.from(mainGrid?.children ?? []);
    expect(mainSections).toHaveLength(2);
    expect(mainSections[0]).toHaveTextContent('Pending Tasks');
    expect(mainSections[0]).toHaveTextContent('Algebra Quiz');
    expect(mainSections[1]).toHaveTextContent('Recent Lessons');
    expect(mainSections[1]).toHaveTextContent('Linear Equations');
    expect(mockedLessonService.getRecent).toHaveBeenCalledTimes(1);
    expect(mockedLessonService.getRecent).toHaveBeenCalledWith(4);
    expect(mockedLessonService.getByClass).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1/modules/module-1?lessonId=lesson-1',
    );

    expect(screen.getByRole('heading', { name: 'Day Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See All/i })).toBeInTheDocument();
    expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
  });

  it('renders empty states when there is no student feed data', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentDashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Your Learning Hub' })).toBeInTheDocument(),
    );

    expect(screen.queryByText('No class schedules for today yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('You are not enrolled in classes yet.')).not.toBeInTheDocument();
    expect(screen.getByText("You're all caught up right now.")).toBeInTheDocument();
    expect(screen.getByText('No recent lessons yet.')).toBeInTheDocument();
  });

  it('excludes assessments from pending tasks when all attempts are already used', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          section: { id: 'section-1', name: 'Rizal', gradeLevel: 'Grade 10' },
          teacher: { id: 'teacher-1', firstName: 'Lopez', lastName: 'Santos' },
          schedules: [],
        },
      ],
    });

    mockedLessonService.getRecent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    });

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-exhausted',
          classId: 'class-1',
          title: 'Short Quiz #1',
          type: 'quiz',
          isPublished: true,
          maxAttempts: 1,
        },
        {
          id: 'assessment-open',
          classId: 'class-1',
          title: 'Activity 1.1',
          type: 'quiz',
          isPublished: true,
          maxAttempts: 2,
        },
      ],
      count: 2,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    mockedAssessmentService.getStudentAttempts.mockImplementation(async (assessmentId: string) => ({
      success: true,
      message: 'ok',
      data:
        assessmentId === 'assessment-exhausted'
          ? [
              {
                id: 'attempt-1',
                assessmentId: 'assessment-exhausted',
                studentId: 'student-1',
                isSubmitted: true,
              },
            ]
          : [],
      count: assessmentId === 'assessment-exhausted' ? 1 : 0,
    }));

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentDashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Your Learning Hub' })).toBeInTheDocument();

    expect(screen.getByText('Activity 1.1')).toBeInTheDocument();
    expect(screen.queryByText('Short Quiz #1')).not.toBeInTheDocument();
    expect(screen.getByText('You have 1 pending task today')).toBeInTheDocument();
  });

  it('shows a safe retryable class-owner error instead of empty dashboard feeds', async () => {
    mockedClassService.getByStudent
      .mockRejectedValueOnce(new Error('dashboard sql detail'))
      .mockResolvedValueOnce({ success: true, message: 'ok', data: [] });
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentDashboardPage />);

    expect(
      await screen.findByText("Dashboard couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText("You're all caught up right now.")).not.toBeInTheDocument();
    expect(screen.queryByText('No recent lessons yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard sql detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(
      await screen.findByRole('heading', { name: 'Your Learning Hub' }),
    ).toBeInTheDocument();
    expect(mockedClassService.getByStudent).toHaveBeenCalledTimes(2);
  });

  it('keeps fulfilled dashboard regions visible during an independent feed outage', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          schedules: [],
        },
      ],
    });
    mockedLessonService.getRecent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-1',
          classId: 'class-1',
          moduleId: 'module-1',
          title: 'Linear Equations',
          order: 1,
          updatedAt: '2026-08-29T04:00:00.000Z',
        },
      ],
      count: 1,
    });
    mockedAssessmentService.getByClass.mockRejectedValueOnce(
      new Error('assessment feed detail'),
    );
    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentDashboardPage />);

    expect(
      await screen.findByText("Some dashboard items couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Day Schedule' })).toBeInTheDocument();
    expect(screen.queryByText("You're all caught up right now.")).not.toBeInTheDocument();
    expect(screen.queryByText('assessment feed detail')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry dashboard feeds/i }),
    ).toBeInTheDocument();
  });

  it('shows a retryable recent-feed state and recovers without per-class lesson calls', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          schedules: [],
        },
      ],
    });
    mockedLessonService.getRecent
      .mockRejectedValueOnce(new Error('recent lesson detail'))
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'lesson-1',
            classId: 'class-1',
            moduleId: 'module-1',
            title: 'Linear Equations',
            order: 1,
            updatedAt: '2026-08-29T04:00:00.000Z',
          },
        ],
        count: 1,
      });
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentDashboardPage />);

    expect(
      await screen.findByText('Recent lessons are temporarily unavailable.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('recent lesson detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry dashboard feeds/i }));

    expect(await screen.findByText('Linear Equations')).toBeInTheDocument();
    expect(mockedLessonService.getRecent).toHaveBeenCalledTimes(2);
    expect(mockedLessonService.getByClass).not.toHaveBeenCalled();
  });

  it('opens the main dashboard guide, covers every page, and closes it', async () => {
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          schoolYear: '2025-2026',
          isActive: true,
          section: { id: 'section-1', name: 'Rizal', gradeLevel: 'Grade 10' },
          teacher: { id: 'teacher-1', firstName: 'Lopez', lastName: 'Santos' },
          schedules: [
            {
              id: 'sched-1',
              days: ['M', 'T', 'W', 'Th', 'F'],
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        },
      ],
    });

    mockedLessonService.getRecent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-1',
          classId: 'class-1',
          moduleId: 'module-1',
          title: 'Linear Equations',
          order: 1,
          updatedAt: '2026-08-29T04:00:00.000Z',
        },
      ],
      count: 1,
    });

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Algebra Quiz',
          type: 'assignment',
          isPublished: true,
          dueDate: '2026-06-18T00:00:00.000Z',
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    });

    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'ann-1',
          classId: 'class-1',
          title: 'Science Fair Prep',
          content: 'Bring your project materials this Friday.',
          isPinned: false,
          isArchived: false,
          createdAt: '2026-04-03T00:00:00.000Z',
        },
      ],
    });

    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'event-1',
          eventType: 'holiday_break',
          schoolYear: '2025-2026',
          title: 'Midyear Break',
          startsAt: '2026-04-15T00:00:00.000Z',
          endsAt: '2026-04-18T00:00:00.000Z',
          allDay: true,
        },
      ],
    });

    render(<StudentDashboardPage />);

    await screen.findByRole('heading', { name: 'Your Learning Hub' });
    fireEvent.click(screen.getByRole('button', { name: /dashboard help/i }));

    expect(await screen.findByText('Student guide: Main Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('Start here on your main dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard buttons')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Check pending tasks before anything else')).toBeInTheDocument();
    expect(screen.getByText('Task card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('Use recent lessons for quick review')).toBeInTheDocument();
    expect(screen.getByText('Open lesson')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 4 of 6')).toBeInTheDocument();
    expect(screen.getByText('Read your day schedule for today only')).toBeInTheDocument();
    expect(screen.getByText('Class details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 5 of 6')).toBeInTheDocument();
    expect(screen.getByText('Use the calendar and event list together')).toBeInTheDocument();
    expect(screen.getByText('Event list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 6 of 6')).toBeInTheDocument();
    expect(screen.getByText('Do not skip reminders and school notices')).toBeInTheDocument();
    expect(screen.getByText('Reminder popup')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText('Page 5 of 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close guide/i }));
    await waitFor(() => {
      expect(screen.queryByText('Student guide: Main Dashboard')).not.toBeInTheDocument();
    });
  });
});
