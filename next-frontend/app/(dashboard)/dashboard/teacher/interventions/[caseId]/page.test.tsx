'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherInterventionWorkspacePage from './page';
import { aiService } from '@/services/ai-service';
import { assessmentService } from '@/services/assessment-service';
import { lessonService } from '@/services/lesson-service';
import { lxpService } from '@/services/lxp-service';
import { toast } from 'sonner';
import type { InterventionStructuredOutput } from '@/types/ai';
import type { TeacherInterventionQueueItem } from '@/types/lxp';

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
    getTeacherClassPolicy: jest.fn(),
    updateTeacherClassPolicy: jest.fn(),
  },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getTeacherQueue: jest.fn().mockResolvedValue({
      data: {
        queue: [],
      },
    }),
    getTeacherCase: jest.fn(),
    assignIntervention: jest.fn(),
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

const mockedAiService = aiService as jest.Mocked<typeof aiService>;
const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function buildQueueEntry(
  caseId: string = 'case-1',
  status: 'pending' | 'active' | 'completed' | 'dismissed' = 'active',
  overrides: Partial<TeacherInterventionQueueItem> = {},
) {
  return {
    id: caseId,
    status,
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
    isCurrentlyAtRisk: true,
    latestBlendedScore: 54.2,
    latestThreshold: 60,
    aiPlanEligible: true,
    totalCheckpoints: 0,
    completedCheckpoints: 0,
    completionPercent: 0,
    progress: {
      xpTotal: 10,
      starsTotal: 1,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    },
    ...overrides,
  };
}

function buildIneligibleQueueEntry(caseId: string = 'case-1') {
  return {
    ...buildQueueEntry(caseId),
    isCurrentlyAtRisk: false,
    aiPlanEligible: false,
    latestBlendedScore: 84.2,
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
    mockedLxpService.getTeacherCase.mockResolvedValue({
      data: buildQueueEntry(),
    } as Awaited<ReturnType<typeof lxpService.getTeacherCase>>);
    mockedLessonService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-manual',
          title: 'Manual Fraction Drill',
          classId: 'class-1',
          order: 1,
          isDraft: false,
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      pageSize: 200,
      totalPages: 1,
    } as Awaited<ReturnType<typeof lessonService.getByClass>>);
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-manual',
          title: 'Manual Fraction Exit Check',
          classId: 'class-1',
          type: 'quiz',
          passingScore: 60,
          isPublished: true,
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      limit: 200,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAiService.getTeacherClassPolicy.mockResolvedValue({
      data: {
        classId: 'class-1',
        mentorExplainEnabled: true,
        maxFollowUpTurns: 3,
        sourceScope: 'class_materials',
        strictGrounding: false,
        updatedBy: 'teacher-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    } as Awaited<ReturnType<typeof aiService.getTeacherClassPolicy>>);
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

  it('updates class AI policy controls from the workspace', async () => {
    mockedAiService.updateTeacherClassPolicy.mockResolvedValue({
      data: {
        classId: 'class-1',
        mentorExplainEnabled: false,
        maxFollowUpTurns: 2,
        sourceScope: 'recommended_only',
        strictGrounding: true,
        updatedBy: 'teacher-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    } as Awaited<ReturnType<typeof aiService.updateTeacherClassPolicy>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText('Class AI policy')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(mockedAiService.updateTeacherClassPolicy).toHaveBeenCalledWith(
        'class-1',
        expect.objectContaining({
          mentorExplainEnabled: false,
        }),
      );
    });
  });

  it('surfaces intervention basis and formative-only review guidance in the workspace', async () => {
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
      expect(screen.getByRole('heading', { name: 'Plan Creator' })).toBeInTheDocument();
    });

    expect(screen.getByText('Intervention Basis')).toBeInTheDocument();
    expect(screen.getAllByText(/grounded on class-scoped materials/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(screen.getByText('Practice lessons then a quick quiz.')).toBeInTheDocument();
    });

    expect(screen.getByText('Weakness detected')).toBeInTheDocument();
    expect(screen.getByText('Recommended lesson review')).toBeInTheDocument();
    expect(screen.getByText('Recommended assessment retry')).toBeInTheDocument();
    expect(screen.getByText('Teacher review before assignment')).toBeInTheDocument();
    expect(
      screen.getByText(/do not automatically alter official class records/i),
    ).toBeInTheDocument();
  });

  it('opens the helper instructions from the question mark button', async () => {
    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Plan Creator' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /module help/i }));

    expect(await screen.findByText('Teacher guide: Intervention Plan Workspace')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Start in Plan Creator')).toBeInTheDocument();
    expect(screen.getByText('Add selected item')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Watch the Generating tab')).toBeInTheDocument();
    expect(screen.getByText('Retry button')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 3 of 4')).toBeInTheDocument();
    expect(screen.getAllByText('Clean Out & Assign').length).toBeGreaterThan(0);
    expect(screen.getByText('Remove item')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 4 of 4')).toBeInTheDocument();
    expect(screen.getByText('Understand replacement protection')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(screen.queryByText('Teacher guide: Intervention Plan Workspace')).not.toBeInTheDocument();
    });
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

  it('falls back to direct case lookup when the case is no longer in the selected queue', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildQueueEntry('case-2')],
      },
    });
    mockedLxpService.getTeacherCase.mockResolvedValue({
      data: buildQueueEntry('case-1', 'completed'),
    } as Awaited<ReturnType<typeof lxpService.getTeacherCase>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Reyes,\s*Alex - trigger 54.2%/i),
      ).toBeInTheDocument();
    });

    expect(mockedLxpService.getTeacherCase).toHaveBeenCalledWith('case-1');
  });

  it('blocks plan generation when the selected case is missing from teacher queue', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildQueueEntry('case-2')],
      },
    });
    mockedLxpService.getTeacherCase.mockResolvedValue({
      data: null,
    } as unknown as Awaited<ReturnType<typeof lxpService.getTeacherCase>>);

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

  it('blocks plan generation when queue case is no longer AI-eligible', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildIneligibleQueueEntry()],
      },
    });

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/is no longer at-risk, so AI planning is disabled/i),
      ).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    expect(generateButton).toBeDisabled();
    fireEvent.click(generateButton);
    expect(mockedAiService.createInterventionJob).not.toHaveBeenCalled();
  });

  it('warns before generating a plan for an existing unstarted intervention path', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [
          buildQueueEntry('case-1', 'active', {
            totalCheckpoints: 2,
            completedCheckpoints: 0,
            completionPercent: 0,
          }),
        ],
      },
    });
    mockedAiService.createInterventionJob.mockResolvedValue({
      data: buildProcessingJob(),
    } as Awaited<ReturnType<typeof aiService.createInterventionJob>>);

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate plan/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    expect(
      await screen.findByText(/already has an assigned intervention path/i),
    ).toBeInTheDocument();
    expect(mockedAiService.createInterventionJob).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: /generate new ai plan/i }),
    );

    await waitFor(() => {
      expect(mockedAiService.createInterventionJob).toHaveBeenCalledWith(
        'case-1',
        { note: undefined },
      );
    });
  });

  it('blocks replacing the current path after student checkpoint progress starts', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [
          buildQueueEntry('case-1', 'active', {
            totalCheckpoints: 2,
            completedCheckpoints: 1,
            completionPercent: 50,
            progress: {
              xpTotal: 10,
              starsTotal: 1,
              streakDays: 1,
              checkpointsCompleted: 1,
              lastActivityAt: null,
            },
          }),
        ],
      },
    });
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

    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Practice lessons then a quick quiz.'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/student has already started this intervention path/i),
    ).toBeInTheDocument();
    const assignButton = screen.getByRole('button', {
      name: /progress already started/i,
    });
    expect(assignButton).toBeDisabled();

    fireEvent.click(assignButton);
    expect(mockedLxpService.assignIntervention).not.toHaveBeenCalled();
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

  it('adds manual lesson and assessment selections and assigns without AI generation', async () => {
    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText('Manual selector')).toBeInTheDocument();
    });

    const manualSelectors = screen.getAllByRole('combobox');
    const lessonSelector = manualSelectors[manualSelectors.length - 2];
    const assessmentSelector = manualSelectors[manualSelectors.length - 1];
    fireEvent.change(lessonSelector, {
      target: { value: 'lesson-manual' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    fireEvent.change(assessmentSelector, {
      target: { value: 'assessment-manual' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]);

    await waitFor(() => {
      expect(screen.getAllByText('Manual Fraction Drill').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Manual Fraction Exit Check').length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole('button', { name: /clean out & assign/i }),
    );

    const assignButton = screen.getByRole('button', {
      name: /assign suggested path/i,
    });
    await waitFor(() => {
      expect(assignButton).toBeEnabled();
    });
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(mockedLxpService.assignIntervention).toHaveBeenCalledWith(
        'case-1',
        expect.objectContaining({
          lessonAssignments: expect.arrayContaining([
            expect.objectContaining({ lessonId: 'lesson-manual' }),
          ]),
          assessmentAssignments: expect.arrayContaining([
            expect.objectContaining({ assessmentId: 'assessment-manual' }),
          ]),
        }),
      );
    });
  });

  it('degrades safely when suggestedAssignmentPayload is missing from AI result', async () => {
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
          structuredOutput: {
            ...buildStructuredResult(),
            suggestedAssignmentPayload: undefined,
          } as unknown as InterventionStructuredOutput,
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
      expect(
        screen.getByText('Practice lessons then a quick quiz.'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /assign suggested path/i }));

    await waitFor(() => {
      expect(mockedLxpService.assignIntervention).toHaveBeenCalled();
    });
  });

  it('keeps assignment disabled while intervention case is pending activation', async () => {
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        queue: [buildQueueEntry('case-1', 'pending')],
      },
    });

    render(<TeacherInterventionWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText('Manual selector')).toBeInTheDocument();
    });

    const manualSelectors = screen.getAllByRole('combobox');
    const lessonSelector = manualSelectors[manualSelectors.length - 2];
    const assessmentSelector = manualSelectors[manualSelectors.length - 1];
    fireEvent.change(lessonSelector, {
      target: { value: 'lesson-manual' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    fireEvent.change(assessmentSelector, {
      target: { value: 'assessment-manual' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]);

    fireEvent.click(
      screen.getByRole('button', { name: /clean out & assign/i }),
    );

    const assignButton = screen.getByRole('button', {
      name: /assign suggested path/i,
    });
    expect(assignButton).toBeDisabled();
    fireEvent.click(assignButton);
    expect(mockedLxpService.assignIntervention).not.toHaveBeenCalled();
  });
});
