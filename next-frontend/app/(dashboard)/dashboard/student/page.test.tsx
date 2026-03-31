'use client';

import { render, screen, waitFor } from '@testing-library/react';
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
  });

  it('renders the compact student dashboard with context rail data', async () => {
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
              days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        },
      ],
    });

    mockedLessonService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-1',
          classId: 'class-1',
          title: 'Linear Equations',
          order: 1,
          isDraft: false,
        },
      ],
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

    expect(screen.getByRole('heading', { name: "Today's Learning Rhythm" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Day Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Announcements & Events' })).toBeInTheDocument();
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

    expect(screen.getByText('No class schedules for today yet.')).toBeInTheDocument();
    expect(screen.getByText('You are not enrolled in classes yet.')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up right now.")).toBeInTheDocument();
  });
});
