'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherInterventionWorkspacePage from './page';
import { aiService } from '@/services/ai-service';
import { lxpService } from '@/services/lxp-service';
import { toast } from 'sonner';

const pushMock = jest.fn();
let mockClassId: string | null = 'class-1';

jest.mock('next/navigation', () => ({
  useParams: () => ({ caseId: 'case-1' }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'classId' ? mockClassId : null),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/ai-service', () => ({
  aiService: {
    getTeacherJobStatus: jest.fn(),
    getInterventionJobResult: jest.fn(),
    createInterventionJob: jest.fn(),
  },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getTeacherQueue: jest.fn().mockResolvedValue({
      data: {
        queue: [],
      },
    }),
    assignIntervention: jest.fn(),
  },
}));

const mockedAiService = aiService as jest.Mocked<typeof aiService>;
const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function buildQueueEntry(caseId: string = 'case-1') {
  return {
    id: caseId,
    studentId: 'student-1',
    student: {
      id: 'student-1',
      firstName: 'Alex',
      lastName: 'Reyes',
      email: 'alex@example.com',
    },
    openedAt: '2026-04-04T00:00:00.000Z',
    triggerScore: 54.2,
    thresholdApplied: 60,
    totalCheckpoints: 2,
    completedCheckpoints: 0,
    completionPercent: 0,
    progress: {
      xpTotal: 10,
      starsTotal: 1,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    },
  };
}

function buildProcessingJob() {
  return {
    jobId: 'job-1',
    jobType: 'remedial_plan_generation',
    status: 'processing' as const,
    progressPercent: 20,
    statusMessage: 'Generating intervention plan...',
    errorMessage: null,
  };
}

function buildCompletedJob() {
  return {
    ...buildProcessingJob(),
    status: 'completed' as const,
    progressPercent: 100,
  };
}

function buildStructuredResult() {
  return {
    caseId: 'case-1',
    weakConcepts: ['Fractions'],
    recommendedLessons: [
      {
        lessonId: 'lesson-1',
        title: 'Fraction Basics',
        reason: 'Target conceptual gaps',
        chunkId: 'chunk-1',
      },
    ],
    recommendedAssessments: [
      {
        assessmentId: 'assessment-1',
        title: 'Fraction Quiz',
        reason: 'Validate mastery',
      },
    ],
    aiSummary: {
      summary: 'Practice lessons then a quick quiz.',
      teacherActions: ['Assign lesson first'],
      studentFocus: ['Denominator concepts'],
    },
    suggestedAssignmentPayload: {
      lessonIds: ['lesson-1'],
      assessmentIds: ['assessment-1'],
    },
  };
}

function buildEmptyStructuredResult() {
  return {
    caseId: 'case-1',
    weakConcepts: ['Fractions'],
    recommendedLessons: [],
    recommendedAssessments: [],
    aiSummary: {
      summary: 'No assignable content found.',
      teacherActions: ['Review source materials'],
      studentFocus: ['Fundamentals'],
    },
    suggestedAssignmentPayload: {
      lessonIds: [],
      assessmentIds: [],
    },
  };
}

describe('TeacherInterventionWorkspacePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClassId = 'class-1';
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildQueueEntry()],
      },
    });
  });

  it('preserves classId in back navigation when class context exists', async () => {
    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /back to interventions/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /back to interventions/i }));

    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/interventions?classId=class-1',
    );
  });

  it('falls back to base interventions route when classId is missing', async () => {
    mockClassId = null;
    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /back to interventions/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /back to interventions/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/teacher/interventions');
  });

  it('allows retrying result load when completed job result fetch initially fails', async () => {
    mockedAiService.createInterventionJob.mockResolvedValue({
      data: buildCompletedJob(),
    } as Awaited<ReturnType<typeof aiService.createInterventionJob>>);
    mockedAiService.getInterventionJobResult
      .mockRejectedValueOnce({
        response: { data: { message: 'Result service unavailable.' } },
      })
      .mockResolvedValueOnce({
        data: {
          job: {
            jobId: 'job-1',
            jobType: 'remedial_plan_generation',
            status: 'completed',
            outputId: 'output-1',
          },
          result: {
            outputId: 'output-1',
            outputType: 'intervention_plan',
            structuredOutput: buildStructuredResult(),
          },
        },
      } as Awaited<ReturnType<typeof aiService.getInterventionJobResult>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate plan/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(screen.getByText('Result service unavailable.')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /retry loading result/i }),
    ).toBeInTheDocument();
    expect(mockedAiService.getInterventionJobResult).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry loading result/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Practice lessons then a quick quiz.'),
      ).toBeInTheDocument();
    });
    expect(mockedToast.error).toHaveBeenCalledWith('Result service unavailable.');
    expect(mockedAiService.getInterventionJobResult).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: /retry loading result/i }),
    ).not.toBeInTheDocument();
  });

  it('blocks plan generation when the selected case is missing from teacher queue', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildQueueEntry('case-2')],
      },
    });

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByText('Select a case from the intervention queue first.'),
      ).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    expect(generateButton).toBeDisabled();

    fireEvent.click(generateButton);

    expect(mockedAiService.createInterventionJob).not.toHaveBeenCalled();
  });

  it('disables assignment when AI result has no assignable lessons or assessments', async () => {
    mockedAiService.createInterventionJob.mockResolvedValue({
      data: buildCompletedJob(),
    } as Awaited<ReturnType<typeof aiService.createInterventionJob>>);
    mockedAiService.getInterventionJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'remedial_plan_generation',
          status: 'completed',
          outputId: 'output-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'intervention_plan',
          structuredOutput: buildEmptyStructuredResult(),
        },
      },
    } as Awaited<ReturnType<typeof aiService.getInterventionJobResult>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate plan/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(screen.getByText('No assignable content found.')).toBeInTheDocument();
    });

    const assignButton = screen.getByRole('button', {
      name: /assign suggested path/i,
    });
    expect(assignButton).toBeDisabled();

    fireEvent.click(assignButton);
    expect(mockedLxpService.assignIntervention).not.toHaveBeenCalled();
  });

  it('uses teacher note as assignment fallback when AI payload note is missing', async () => {
    mockedAiService.createInterventionJob.mockResolvedValue({
      data: buildCompletedJob(),
    } as Awaited<ReturnType<typeof aiService.createInterventionJob>>);
    mockedAiService.getInterventionJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'remedial_plan_generation',
          status: 'completed',
          outputId: 'output-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'intervention_plan',
          structuredOutput: buildStructuredResult(),
        },
      },
    } as Awaited<ReturnType<typeof aiService.getInterventionJobResult>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate plan/i }),
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        /add specific weak areas, pacing guidance, or constraints/i,
      ),
      { target: { value: 'Prioritize denominator misconceptions.' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Practice lessons then a quick quiz.'),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /assign suggested path/i }),
    );

    await waitFor(() => {
      expect(mockedLxpService.assignIntervention).toHaveBeenCalledWith(
        'case-1',
        expect.objectContaining({
          note: 'Prioritize denominator misconceptions.',
        }),
      );
    });
  });
});
