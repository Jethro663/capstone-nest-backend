import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StudentAssessmentPage from './page';
import { assessmentService } from '@/services/assessment-service';

const replace = jest.fn();
const push = jest.fn();
const getSearchParam = jest.fn(() => null);

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1' }),
  useRouter: () => ({ replace, push }),
  useSearchParams: () => ({ get: getSearchParam }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    section: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  },
  useReducedMotion: () => true,
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getById: jest.fn(),
    getStudentAttempts: jest.fn(),
    startAttempt: jest.fn(),
    unsubmitFileUpload: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

describe('StudentAssessmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSearchParam.mockReturnValue(null);
    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'assessment-1',
        title: 'File Upload Assessment',
        classId: 'class-1',
        type: 'file_upload',
        isPublished: true,
        maxAttempts: 1,
        questions: [],
      },
    });
  });

  it('does not auto-redirect returned file upload attempts to the take page', async () => {
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'attempt-returned',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          isSubmitted: true,
          isReturned: true,
          submittedAt: '2026-03-22T10:00:00.000Z',
          createdAt: '2026-03-22T09:00:00.000Z',
        },
      ],
    });

    render(<StudentAssessmentPage />);

    await waitFor(() => {
      expect(mockedAssessmentService.getStudentAttempts).toHaveBeenCalledWith('assessment-1');
    });

    expect(replace).not.toHaveBeenCalledWith('/dashboard/student/assessments/assessment-1/take');
  });

  it('still auto-redirects active file upload drafts to the take page', async () => {
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'attempt-draft',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          isSubmitted: false,
          createdAt: '2026-03-22T09:00:00.000Z',
        },
      ],
    });

    render(<StudentAssessmentPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/dashboard/student/assessments/assessment-1/take');
    });
  });

  it('uses the neutral assessment shell instead of the older student-page theme wrapper', async () => {
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 0,
      data: [],
    });

    const { container } = render(<StudentAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText('File Upload Assessment')).toBeInTheDocument();
    });

    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('mx-auto');
    expect(container.firstChild).not.toHaveClass('student-page');
  });

  it('disables retakes when the student already has a returned grade', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        id: 'assessment-1',
        title: 'Objective Quiz',
        classId: 'class-1',
        type: 'quiz',
        isPublished: true,
        maxAttempts: 3,
        questions: [],
      },
    });
    mockedAssessmentService.getStudentAttempts.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'attempt-returned',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          isSubmitted: true,
          isReturned: true,
          score: 92,
          passed: true,
          submittedAt: '2026-03-22T10:00:00.000Z',
          createdAt: '2026-03-22T09:00:00.000Z',
        },
      ],
    });

    render(<StudentAssessmentPage />);

    const button = await screen.findByRole('button', { name: /already graded/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/retakes are disabled once your teacher has returned a grade/i)).toBeInTheDocument();
  });
});
