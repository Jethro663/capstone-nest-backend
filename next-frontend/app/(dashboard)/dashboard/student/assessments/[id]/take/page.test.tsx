import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
import StudentAssessmentTakePage from './page';
import { assessmentService } from '@/services/assessment-service';

const replace = jest.fn();
const studentObjectiveAssessmentSurfaceMock = jest.fn<null, [unknown]>(
  () => null,
);

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

jest.mock(
  '@/components/student/assessment/StudentObjectiveAssessmentSurface',
  () => ({
    StudentObjectiveAssessmentSurface: (props: unknown) => {
      studentObjectiveAssessmentSurfaceMock(props);
      return null;
    },
  }),
);

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getById: jest.fn(),
    getOngoingAttempt: jest.fn(),
    getStudentAttempts: jest.fn(),
    startAttempt: jest.fn(),
    updateAttemptProgress: jest.fn(),
    uploadSubmissionFile: jest.fn(),
    removeSubmissionFile: jest.fn(),
    submit: jest.fn(),
    downloadTeacherAttachment: jest.fn(),
    downloadAttemptSubmissionFile: jest.fn(),
    downloadAttemptSubmissionAttachmentFile: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;

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
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'attempts',
      data: [],
      count: 0,
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
      expect(mockedAssessmentService.startAttempt).toHaveBeenCalledWith(
        'assessment-1',
      );
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to returned results instead of starting a new file upload attempt', async () => {
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'attempts',
      count: 1,
      data: [
        {
          id: 'attempt-returned',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          isSubmitted: true,
          isReturned: true,
          submittedAt: '2026-03-22T10:00:00.000Z',
          updatedAt: '2026-03-22T10:00:00.000Z',
          createdAt: '2026-03-22T09:00:00.000Z',
        },
      ],
    });

    render(<StudentAssessmentTakePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        '/dashboard/student/assessments/assessment-1/results/attempt-returned',
      );
    });

    expect(mockedAssessmentService.startAttempt).not.toHaveBeenCalled();
  });

  it('passes option image fields through to the student objective surface', async () => {
    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'assessment-1',
        title: 'Choice Assessment',
        classId: 'class-1',
        type: 'quiz',
        isPublished: true,
        randomizeQuestions: false,
        questions: [
          {
            id: 'question-1',
            assessmentId: 'assessment-1',
            type: 'multiple_choice',
            content: '<p>Pick the image answer</p>',
            points: 5,
            order: 1,
            imageUrl: '/api/assessments/questions/images/question.png',
            imageDisplayMode: 'expanded',
            imageZoom: 120,
            imagePositionX: 35,
            imagePositionY: 65,
            options: [
              {
                id: 'option-1',
                isCorrect: true,
                order: 1,
                text: '',
                imageUrl: '/api/assessments/questions/images/option.png',
                imageDisplayMode: 'expanded',
                imageZoom: 130,
                imagePositionX: 20,
                imagePositionY: 80,
              },
              {
                id: 'option-2',
                isCorrect: false,
                order: 2,
                text: 'Text choice',
              },
            ],
          },
        ],
      },
    });
    mockedAssessmentService.getOngoingAttempt.mockResolvedValue({
      success: true,
      message: 'ongoing',
      data: {
        attempt: {
          id: 'attempt-1',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          draftResponses: [],
          questionOrder: ['question-1'],
          lastQuestionIndex: 0,
          violationCount: 0,
        },
        timeLimitMinutes: null,
        strictMode: false,
        timedQuestionsEnabled: false,
      },
    });

    render(<StudentAssessmentTakePage />);

    await waitFor(() => {
      expect(studentObjectiveAssessmentSurfaceMock).toHaveBeenCalled();
    });

    const lastCall = studentObjectiveAssessmentSurfaceMock.mock.calls[
      studentObjectiveAssessmentSurfaceMock.mock.calls.length - 1
    ]?.[0] as {
      question: {
        imageUrl?: string;
        imageDisplayMode?: string;
        imageZoom?: number;
        imagePositionX?: number;
        imagePositionY?: number;
        options: Array<{
          imageUrl?: string;
          imageDisplayMode?: string;
          imageZoom?: number;
          imagePositionX?: number;
          imagePositionY?: number;
        }>;
      };
    };

    expect(lastCall.question.imageUrl).toBe(
      '/api/assessments/questions/images/question.png',
    );
    expect(lastCall.question.imageDisplayMode).toBe('expanded');
    expect(lastCall.question.imageZoom).toBe(120);
    expect(lastCall.question.imagePositionX).toBe(35);
    expect(lastCall.question.imagePositionY).toBe(65);
    expect(lastCall.question.options[0]).toMatchObject({
      imageUrl: '/api/assessments/questions/images/option.png',
      imageDisplayMode: 'expanded',
      imageZoom: 130,
      imagePositionX: 20,
      imagePositionY: 80,
    });
  });
});
