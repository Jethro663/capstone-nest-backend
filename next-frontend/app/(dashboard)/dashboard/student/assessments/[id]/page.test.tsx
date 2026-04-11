import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
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
});
