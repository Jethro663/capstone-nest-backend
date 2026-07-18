import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherPerformancePage from './page';
import { classService } from '@/services/class-service';
import { healthService } from '@/services/health-service';
import { performanceService } from '@/services/performance-service';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1' },
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByTeacher: jest.fn(),
  },
}));

jest.mock('@/services/health-service', () => ({
  healthService: {
    getReadiness: jest.fn(),
  },
}));

jest.mock('@/services/performance-service', () => ({
  performanceService: {
    getClassSummary: jest.fn(),
    getAtRiskStudents: jest.fn(),
    getInterventionQuizComparison: jest.fn(),
    getClassLogs: jest.fn(),
    getClassDiagnostics: jest.fn(),
    recomputeClass: jest.fn(),
    createAnalysisJob: jest.fn(),
    getAnalysisJobStatus: jest.fn(),
    getAnalysisJobResult: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/ai-service', () => ({
  aiService: {
    createLessonPlanJob: jest.fn(),
    getTeacherJobStatus: jest.fn(),
    getLessonPlanJobResult: jest.fn(),
    updateLessonPlanDraft: jest.fn(),
  },
}));

jest.mock('@/utils/lesson-plan-pdf', () => ({
  downloadLessonPlanPdf: jest.fn(),
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;
const mockedPerformanceService = performanceService as jest.Mocked<typeof performanceService>;

describe('TeacherPerformancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedClassService.getByTeacher.mockResolvedValue({
      data: [
        {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-7',
          section: { name: 'Rizal' },
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedPerformanceService.getClassSummary.mockResolvedValue({
      data: {
        classId: 'class-1',
        threshold: 74,
        totalStudents: 1,
        studentsWithData: 1,
        atRiskCount: 1,
        atRiskRate: 100,
        averages: {
          assessment: 62,
          classRecord: 60,
          blended: 61,
        },
      },
    } as Awaited<ReturnType<typeof performanceService.getClassSummary>>);
    mockedPerformanceService.getAtRiskStudents.mockResolvedValue({
      data: {
        classId: 'class-1',
        threshold: 74,
        students: [
          {
            studentId: 'student-1',
            firstName: 'Liam',
            lastName: 'Navarro',
            email: 'liam@example.com',
            assessmentAverage: 62,
            classRecordAverage: 60,
            blendedScore: 61,
            thresholdApplied: 74,
            isAtRisk: true,
            lastComputedAt: '2026-04-30T00:00:00.000Z',
          },
        ],
      },
    } as Awaited<ReturnType<typeof performanceService.getAtRiskStudents>>);
    mockedPerformanceService.getClassLogs.mockResolvedValue({
      data: {
        classId: 'class-1',
        threshold: 74,
        count: 0,
        logs: [],
      },
    } as Awaited<ReturnType<typeof performanceService.getClassLogs>>);
    mockedPerformanceService.getInterventionQuizComparison.mockResolvedValue({
      data: {
        classId: 'class-1',
        count: 1,
        improvedCount: 1,
        declinedCount: 0,
        unchangedCount: 0,
        awaitingRetryCount: 0,
        comparisons: [
          {
            caseId: 'case-1',
            caseStatus: 'active',
            caseOpenedAt: '2026-05-01T08:00:00.000Z',
            studentId: 'student-1',
            student: {
              id: 'student-1',
              firstName: 'Liam',
              lastName: 'Navarro',
              email: 'liam@example.com',
            },
            assignmentId: 'assignment-1',
            assessmentId: 'assessment-1',
            assessmentTitle: 'Fractions Quiz',
            beforeAttemptId: 'before-1',
            beforeScorePercent: 52,
            beforeSubmittedAt: '2026-04-30T08:00:00.000Z',
            afterAttemptId: 'after-1',
            afterScorePercent: 78,
            afterSubmittedAt: '2026-05-02T08:00:00.000Z',
            deltaScorePercent: 26,
            trend: 'improved',
          },
        ],
      },
    } as Awaited<ReturnType<typeof performanceService.getInterventionQuizComparison>>);
    mockedPerformanceService.getClassDiagnostics.mockResolvedValue({
      data: {
        classId: 'class-1',
        threshold: 74,
        lowestAssessments: [],
        conceptHotspots: [],
        studentCount: 1,
        atRiskCount: 1,
        insufficientEvidence: false,
      },
    } as Awaited<ReturnType<typeof performanceService.getClassDiagnostics>>);
    mockedPerformanceService.recomputeClass.mockResolvedValue({
      data: {
        classId: 'class-1',
        recomputed: 1,
      },
    } as Awaited<ReturnType<typeof performanceService.recomputeClass>>);
  });

  it('shows the AI outage rail and disables AI analysis while keeping refresh available', async () => {
    mockedHealthService.getReadiness.mockResolvedValueOnce({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: {
          ok: true,
          degraded: true,
          message: 'AI service reachable but no AI runtime is available',
        },
      },
    });

    render(<TeacherPerformancePage />);

    expect(await screen.findByText(/AI tools are paused/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Analyze$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Analyze Whole Class/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Lesson Plan/i }));
    expect(screen.getByRole('button', { name: /Generate Lesson Plan/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    await waitFor(() => {
      expect(mockedPerformanceService.recomputeClass).toHaveBeenCalledWith('class-1');
    });
    expect(mockedPerformanceService.createAnalysisJob).not.toHaveBeenCalled();
  });

  it('keeps healthy panels visible when diagnostics fail and retries only diagnostics', async () => {
    mockedPerformanceService.getClassDiagnostics.mockRejectedValueOnce(
      new Error('sql detail'),
    );

    render(<TeacherPerformancePage />);

    expect(
      await screen.findByText('Diagnostics temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByText('Navarro, Liam')).toBeInTheDocument();
    expect(screen.queryByText('No concept focus areas yet')).not.toBeInTheDocument();
    expect(screen.queryByText('sql detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Heatmap/i }));
    expect(
      screen.getByText('Diagnostics temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No concept focus areas yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Details/i }));
    expect(
      screen.getByText('Diagnostics temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No assessment signals yet.')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /retry diagnostics/i }),
    );

    await waitFor(() => {
      expect(mockedPerformanceService.getClassDiagnostics).toHaveBeenCalledTimes(2);
    });
    expect(mockedPerformanceService.getClassSummary).toHaveBeenCalledTimes(1);
  });

  it('shows a successful empty diagnostics state only after diagnostics load', async () => {
    render(<TeacherPerformancePage />);

    fireEvent.click(await screen.findByRole('button', { name: /Heatmap/i }));

    expect(
      await screen.findByText('No concept focus areas yet'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Diagnostics temporarily unavailable'),
    ).not.toBeInTheDocument();
  });

  it('renders a dedicated concept mastery heatmap tab when concept hotspots are available', async () => {
    mockedPerformanceService.getClassDiagnostics.mockResolvedValueOnce({
      data: {
        classId: 'class-1',
        threshold: 74,
        lowestAssessments: [],
        conceptHotspots: [
          {
            concept: 'fractions',
            wrongCount: 6,
            masteryScore: 41,
            evidenceCount: 8,
          },
          {
            concept: 'decimals',
            wrongCount: 2,
            masteryScore: 83,
            evidenceCount: 5,
          },
        ],
        studentCount: 12,
        atRiskCount: 4,
        insufficientEvidence: false,
      },
    } as Awaited<ReturnType<typeof performanceService.getClassDiagnostics>>);

    render(<TeacherPerformancePage />);

    expect(await screen.findByRole('button', { name: /Heatmap/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Heatmap/i }));

    expect(await screen.findByText(/Concept Mastery Heatmap/i)).toBeInTheDocument();
    expect(screen.getAllByText('High mastery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: /Concept/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Mastery/i })).toBeInTheDocument();
    expect(screen.getAllByText('Fractions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Decimals').length).toBeGreaterThan(0);
  });

  it('strips rich-text tags from heatmap concepts and teacher action copy', async () => {
    mockedPerformanceService.getClassDiagnostics.mockResolvedValueOnce({
      data: {
        classId: 'class-1',
        threshold: 74,
        lowestAssessments: [],
        conceptHotspots: [
          {
            concept: 'P Dropdown Time P',
            wrongCount: 3,
            masteryScore: 64,
            evidenceCount: 3,
          },
          {
            concept: 'P P',
            wrongCount: 1,
            masteryScore: 52,
            evidenceCount: 1,
          },
        ],
        studentCount: 12,
        atRiskCount: 4,
        insufficientEvidence: false,
      },
    } as Awaited<ReturnType<typeof performanceService.getClassDiagnostics>>);
    mockedPerformanceService.createAnalysisJob.mockResolvedValueOnce({
      data: {
        jobId: 'job-1',
        status: 'completed',
        progressPercent: 100,
        statusMessage: 'done',
        outputId: 'output-1',
      },
    } as Awaited<ReturnType<typeof performanceService.createAnalysisJob>>);
    mockedPerformanceService.getAnalysisJobResult.mockResolvedValueOnce({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'performance_analysis',
          status: 'completed',
          outputId: 'output-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'performance_analysis',
          structuredOutput: {
            classId: 'class-1',
            studentId: null,
            generatedAt: '2026-04-30T00:00:00.000Z',
            insufficientEvidence: false,
            teacherNote: null,
            learningGaps: [
              {
                concept: 'P This IS A Multi',
                wrongCount: 3,
                evidenceCount: 3,
                masteryScore: 64,
                lessonEvidence: [],
              },
            ],
            scoreBreakdown: [],
            evidence: [],
            teacherActions: ['<p>Plan reteach before the next graded task</p>'],
            recommendedIntervention: {
              shouldOpenCase: true,
              status: 'actionable',
              topConcepts: ['<p>Dropdown Time</p>'],
            },
          },
        },
      },
    } as Awaited<ReturnType<typeof performanceService.getAnalysisJobResult>>);

    render(<TeacherPerformancePage />);

    fireEvent.click(await screen.findByRole('button', { name: /Analyze Whole Class/i }));

    expect(await screen.findByText('Plan reteach before the next graded task')).toBeInTheDocument();
    expect(screen.queryByText(/^P Dropdown Time P$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^P This IS A Multi\.? P$/i)).not.toBeInTheDocument();
    expect(screen.getByText('This IS A Multi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Heatmap/i }));

    expect(screen.getAllByText('Dropdown Time').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^P Dropdown Time P$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Unlabeled concept').length).toBeGreaterThan(0);
  });
});
