import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherLessonsPage from './page';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' } }),
}));

jest.mock('@/services/class-service', () => ({
  classService: { getByTeacher: jest.fn() },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: { getByClass: jest.fn() },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;

const classes = [
  { id: 'class-1', subjectCode: 'MATH-7', subjectName: 'Mathematics' },
  { id: 'class-2', subjectCode: 'SCI-7', subjectName: 'Science' },
];

function lesson(id: string, classId: string, title: string) {
  return {
    id,
    classId,
    title,
    description: '',
    isDraft: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  };
}

describe('TeacherLessonsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClassService.getByTeacher.mockResolvedValue({
      data: [classes[0]],
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedLessonService.getByClass.mockResolvedValue({
      data: [lesson('lesson-1', 'class-1', 'Linear Equations')],
    } as Awaited<ReturnType<typeof lessonService.getByClass>>);
  });

  it('shows the initial loading state while class ownership is unresolved', () => {
    mockedClassService.getByTeacher.mockReturnValueOnce(
      new Promise(() => undefined),
    );

    const { container } = render(<TeacherLessonsPage />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('No lessons yet')).not.toBeInTheDocument();
  });

  it('shows a safe retryable owner error instead of an empty state', async () => {
    mockedClassService.getByTeacher.mockRejectedValueOnce(
      new Error('network detail'),
    );

    render(<TeacherLessonsPage />);

    expect(
      await screen.findByText("Lessons couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('No lessons yet')).not.toBeInTheDocument();
    expect(screen.queryByText('network detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(mockedClassService.getByTeacher).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Linear Equations')).toBeInTheDocument();
  });

  it('renders source-empty copy only after successful collection requests', async () => {
    mockedLessonService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      pageSize: 20,
      count: 0,
      total: 0,
      page: 1,
      totalPages: 1,
      data: [],
    } as Awaited<ReturnType<typeof lessonService.getByClass>>);

    render(<TeacherLessonsPage />);

    expect(await screen.findByText('No lessons yet')).toBeInTheDocument();
    expect(
      screen.queryByText('No lessons match this view'),
    ).not.toBeInTheDocument();
  });

  it('renders populated content and distinguishes filter-empty results', async () => {
    render(<TeacherLessonsPage />);

    expect(await screen.findByText('Linear Equations')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search lessons/i), {
      target: { value: 'geometry' },
    });
    expect(screen.getByText('No lessons match this view')).toBeInTheDocument();
    expect(screen.queryByText('No lessons yet')).not.toBeInTheDocument();
  });

  it('keeps fulfilled classes visible when another class request fails', async () => {
    mockedClassService.getByTeacher.mockResolvedValueOnce({
      data: classes,
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedLessonService.getByClass.mockImplementation(async (classId) => {
      if (classId === 'class-2') throw new Error('science unavailable');
      return {
        data: [lesson('lesson-1', 'class-1', 'Linear Equations')],
      } as Awaited<ReturnType<typeof lessonService.getByClass>>;
    });

    render(<TeacherLessonsPage />);

    expect(
      await screen.findByText('Some lessons are temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    expect(screen.queryByText('science unavailable')).not.toBeInTheDocument();
  });
});
