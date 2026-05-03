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
        logs: [],
      },
    } as Awaited<ReturnType<typeof performanceService.getClassLogs>>);
    mockedPerformanceService.getClassDiagnostics.mockResolvedValue({
      data: {
        classId: 'class-1',
        lowestAssessments: [],
        conceptHotspots: [],
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
});
