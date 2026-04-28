'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherClassesPage from './page';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'teacher-1',
      firstName: 'Ana',
      lastName: 'Reyes',
    },
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByTeacher: jest.fn(),
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
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedAnnouncementService = announcementService as jest.Mocked<
  typeof announcementService
>;

describe('TeacherClassesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedClassService.getByTeacher.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-07A',
          section: {
            name: 'Section A',
            gradeLevel: '7',
          },
          teacher: {
            firstName: 'Ana',
            lastName: 'Reyes',
          },
          schedules: [
            {
              days: ['T'],
              startTime: '06:00',
              endTime: '07:00',
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
          isDraft: false,
        },
      ],
    } as Awaited<ReturnType<typeof lessonService.getByClass>>);
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-1',
          title: 'Quiz 1',
          isPublished: true,
          dueDate: '2026-04-25T08:00:00.000Z',
        },
      ],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);
  });

  it('renders teacher-facing hero copy for the teaching workspace', async () => {
    render(<TeacherClassesPage />);

    await screen.findByRole('heading', { name: 'My Classes' });

    await waitFor(() =>
      expect(mockedClassService.getByTeacher).toHaveBeenCalledWith(
        'teacher-1',
        'active',
      ),
    );

    expect(screen.getByText('Teacher Workspace')).toBeInTheDocument();
    expect(
      screen.queryByText('Student Workspace'),
    ).not.toBeInTheDocument();
  });

  it('opens the helper guide from the question mark button', async () => {
    render(<TeacherClassesPage />);

    await screen.findByRole('heading', { name: 'My Classes' });

    fireEvent.click(screen.getByRole('button', { name: /module help/i }));

    expect(await screen.findByText('Teacher guide: My Classes')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Start with the header')).toBeInTheDocument();
    expect(screen.getByText('Refresh button')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Find the right class')).toBeInTheDocument();
    expect(screen.getByText('Search box')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 3 of 4')).toBeInTheDocument();
    expect(screen.getByText('Open class work')).toBeInTheDocument();
    expect(screen.getByText('Class card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 4 of 4')).toBeInTheDocument();
    expect(screen.getByText('Use the calendar rail')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(screen.queryByText('Teacher guide: My Classes')).not.toBeInTheDocument();
    });
  });
});
