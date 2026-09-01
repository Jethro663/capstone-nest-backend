import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherAssessmentsPage from './page';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { academicStateService } from '@/services/academic-state-service';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' } }),
}));

jest.mock('@/services/class-service', () => ({
  classService: { getByTeacher: jest.fn() },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: { getByClass: jest.fn() },
}));
jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn() },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedAcademicStateService = academicStateService as jest.Mocked<
  typeof academicStateService
>;

const classes = [
  { id: 'class-1', subjectCode: 'MATH-7', subjectName: 'Mathematics' },
  { id: 'class-2', subjectCode: 'SCI-7', subjectName: 'Science' },
];

function assessment(
  id: string,
  classId: string,
  title: string,
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  isPublished = false,
) {
  return {
    id,
    classId,
    title,
    type: 'quiz',
    isPublished,
    quarter,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  };
}

describe('TeacherAssessmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAcademicStateService.getCurrent.mockResolvedValue({
      success: true,
      message: 'Current state',
      data: {
        policy: {
          periods: [
            { key: 'Q1', label: 'Quarter 1' },
            { key: 'Q2', label: 'Quarter 2' },
            { key: 'Q3', label: 'Quarter 3' },
            { key: 'Q4', label: 'Quarter 4' },
          ],
        },
      },
    } as Awaited<ReturnType<typeof academicStateService.getCurrent>>);
    mockedClassService.getByTeacher.mockResolvedValue({
      data: [classes[0]],
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedAssessmentService.getByClass.mockResolvedValue({
      data: [assessment('assessment-1', 'class-1', 'Fractions Checkpoint')],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
  });

  it('shows the initial loading state while class ownership is unresolved', () => {
    mockedClassService.getByTeacher.mockReturnValueOnce(
      new Promise(() => undefined),
    );

    const { container } = render(<TeacherAssessmentsPage />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('No assessments yet')).not.toBeInTheDocument();
  });

  it('shows a safe retryable owner error instead of an empty state', async () => {
    mockedClassService.getByTeacher.mockRejectedValueOnce(
      new Error('network detail'),
    );

    render(<TeacherAssessmentsPage />);

    expect(
      await screen.findByText("Assessments couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('No assessments yet')).not.toBeInTheDocument();
    expect(screen.queryByText('network detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(mockedClassService.getByTeacher).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Fractions Checkpoint')).toBeInTheDocument();
  });

  it('renders source-empty copy only after successful collection requests', async () => {
    mockedAssessmentService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      count: 0,
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      data: [],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);

    render(<TeacherAssessmentsPage />);

    expect(await screen.findByText('No assessments yet')).toBeInTheDocument();
    expect(
      screen.queryByText('No assessments match this view'),
    ).not.toBeInTheDocument();
  });

  it('renders populated content and distinguishes filter-empty results', async () => {
    render(<TeacherAssessmentsPage />);

    expect(await screen.findByText('Fractions Checkpoint')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search assessments/i), {
      target: { value: 'geometry' },
    });
    expect(
      screen.getByText('No assessments match this view'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No assessments yet')).not.toBeInTheDocument();
  });

  it('keeps fulfilled classes visible when another class request fails', async () => {
    mockedClassService.getByTeacher.mockResolvedValueOnce({
      data: classes,
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedAssessmentService.getByClass.mockImplementation(async (classId) => {
      if (classId === 'class-2') throw new Error('science unavailable');
      return {
        data: [assessment('assessment-1', 'class-1', 'Fractions Checkpoint')],
      } as Awaited<ReturnType<typeof assessmentService.getByClass>>;
    });

    render(<TeacherAssessmentsPage />);

    expect(
      await screen.findByText('Some assessments are temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByText('Fractions Checkpoint')).toBeInTheDocument();
    expect(screen.queryByText('science unavailable')).not.toBeInTheDocument();
  });

  it('combines quarter, status, class, and search filters with unassigned only in all quarters', async () => {
    mockedClassService.getByTeacher.mockResolvedValueOnce({ data: classes } as Awaited<
      ReturnType<typeof classService.getByTeacher>
    >);
    mockedAssessmentService.getByClass.mockImplementation(async (classId) => ({
      data:
        classId === 'class-1'
          ? [
              assessment('q4', classId, 'Quarter Four Draft', 'Q4'),
              assessment('none', classId, 'Unassigned Draft'),
            ]
          : [assessment('published', classId, 'Quarter Four Published', 'Q4', true)],
    }) as Awaited<ReturnType<typeof assessmentService.getByClass>>);

    render(<TeacherAssessmentsPage />);
    await screen.findByText('Quarter Four Draft');
    expect(screen.getByText('Unassigned Draft')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Quarter 4' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/quarter filter/i), {
      target: { value: 'Q4' },
    });
    expect(screen.queryByText('Unassigned Draft')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/status filter/i), {
      target: { value: 'published' },
    });
    fireEvent.change(screen.getByLabelText(/class filter/i), {
      target: { value: 'class-2' },
    });
    fireEvent.change(screen.getByPlaceholderText(/search assessments/i), {
      target: { value: 'published' },
    });
    expect(screen.getByText('Quarter Four Published')).toBeInTheDocument();
    expect(screen.queryByText('Quarter Four Draft')).not.toBeInTheDocument();
  });
});
