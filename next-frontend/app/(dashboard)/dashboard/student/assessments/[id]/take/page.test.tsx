import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
import StudentAssessmentTakePage from './page';
import { assessmentService } from '@/services/assessment-service';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1' }),
  useRouter: () => ({ replace, push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
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
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
  useReducedMotion: () => true,
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getById: jest.fn(),
    getOngoingAttempt: jest.fn(),
    startAttempt: jest.fn(),
    updateAttemptProgress: jest.fn(),
    uploadSubmissionFile: jest.fn(),
    submit: jest.fn(),
    downloadTeacherAttachment: jest.fn(),
    downloadAttemptSubmissionFile: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

describe('StudentAssessmentTakePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'assessment-1',
        title: 'File Upload Assessment',
        classId: 'class-1',
        type: 'file_upload',
        isPublished: true,
        allowedUploadExtensions: ['pdf'],
        maxUploadSizeBytes: 100 * 1024 * 1024,
        questions: [],
      },
    });
    mockedAssessmentService.getOngoingAttempt.mockResolvedValue({
      success: true,
      message: 'none',
      data: null,
    });
    mockedAssessmentService.startAttempt.mockResolvedValue({
      success: true,
      message: 'started',
      data: {
        attempt: {
          id: 'attempt-1',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          draftResponses: [],
          lastQuestionIndex: 0,
          violationCount: 0,
        },
        timeLimitMinutes: null,
        strictMode: false,
        timedQuestionsEnabled: false,
      },
    });
  });

  it('auto-starts file upload attempts instead of redirecting when no ongoing attempt exists', async () => {
    render(<StudentAssessmentTakePage />);

    await waitFor(() => {
      expect(mockedAssessmentService.startAttempt).toHaveBeenCalledWith('assessment-1');
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
