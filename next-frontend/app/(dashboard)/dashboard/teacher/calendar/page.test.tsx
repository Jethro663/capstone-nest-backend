import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherCalendarPage from './page';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { schoolEventService } from '@/services/school-event-service';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' } }),
}));

jest.mock('@/services/class-service', () => ({
  classService: { getByTeacher: jest.fn() },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: { getByClass: jest.fn() },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: { getByClass: jest.fn() },
}));

jest.mock('@/services/school-event-service', () => ({
  schoolEventService: { getAll: jest.fn() },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedSchoolEventService = schoolEventService as jest.Mocked<typeof schoolEventService>;

const teacherClass = {
  id: 'class-1',
  subjectCode: 'MATH-7',
  subjectName: 'Mathematics',
  schoolYear: '2026-2027',
  section: { name: 'Rizal' },
};

describe('TeacherCalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClassService.getByTeacher.mockResolvedValue({ data: [teacherClass] } as Awaited<
      ReturnType<typeof classService.getByTeacher>
    >);
    mockedAssessmentService.getByClass.mockResolvedValue({ data: [] } as Awaited<
      ReturnType<typeof assessmentService.getByClass>
    >);
    mockedAnnouncementService.getByClass.mockResolvedValue({ data: [] } as Awaited<
      ReturnType<typeof announcementService.getByClass>
    >);
    mockedSchoolEventService.getAll.mockResolvedValue({ data: [] } as Awaited<
      ReturnType<typeof schoolEventService.getAll>
    >);
  });

  it('shows the initial loading state while classes are unresolved', () => {
    mockedClassService.getByTeacher.mockReturnValueOnce(new Promise(() => undefined));

    const { container } = render(<TeacherCalendarPage />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows a safe class-list failure and retries only class ownership', async () => {
    mockedClassService.getByTeacher.mockRejectedValueOnce(new Error('class network detail'));

    render(<TeacherCalendarPage />);

    expect(await screen.findByText("Calendar classes couldn't be loaded")).toBeInTheDocument();
    expect(screen.queryByText('class network detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(mockedClassService.getByTeacher).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps fulfilled feed data visible and retries only calendar feeds', async () => {
    mockedAssessmentService.getByClass.mockResolvedValue({
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Future Fractions Quiz',
          type: 'quiz',
          dueDate: '2099-08-20T08:00:00.000Z',
          isPublished: true,
        },
      ],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAnnouncementService.getByClass.mockRejectedValueOnce(
      new Error('announcement detail'),
    );

    render(<TeacherCalendarPage />);

    expect(
      await screen.findByText('Some calendar items are temporarily unavailable'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
    expect(await screen.findByText('Future Fractions Quiz')).toBeInTheDocument();
    expect(screen.queryByText('announcement detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry calendar items/i }));
    await waitFor(() => {
      expect(mockedAssessmentService.getByClass).toHaveBeenCalledTimes(2);
    });
    expect(mockedClassService.getByTeacher).toHaveBeenCalledTimes(1);
  });

  it('shows successful zero scheduled items only after feeds resolve', async () => {
    render(<TeacherCalendarPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Upcoming' }));
    expect(await screen.findByText('No upcoming items')).toBeInTheDocument();
    expect(
      screen.queryByText('Some calendar items are temporarily unavailable'),
    ).not.toBeInTheDocument();
  });
});
