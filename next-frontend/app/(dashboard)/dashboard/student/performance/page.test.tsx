import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StudentPerformancePage from './page';
import { performanceService } from '@/services/performance-service';
import type { StudentOwnPerformanceSummary } from '@/types/performance';

jest.mock('framer-motion', () => {
  return {
    motion: {
      div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      article: ({ children }: { children: ReactNode }) => <article>{children}</article>,
      svg: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
    },
    useReducedMotion: () => false,
  };
});

jest.mock('@/services/performance-service', () => ({
  performanceService: {
    getStudentOwnSummary: jest.fn(),
  },
}));

const mockedPerformanceService = performanceService as jest.Mocked<typeof performanceService>;

type ClassOverride = Partial<StudentOwnPerformanceSummary['classes'][number]>;

function buildSummary(options?: {
  atRiskClasses?: number;
  averageBlendedScore?: number | null;
  classes?: ClassOverride[];
}): StudentOwnPerformanceSummary {
  const baseClasses: StudentOwnPerformanceSummary['classes'] = [
    {
      classId: 'class-math',
      class: {
        id: 'class-math',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        section: null,
      },
      assessmentAverage: 70,
      classRecordAverage: 66,
      blendedScore: 68,
      assessmentSampleSize: 4,
      classRecordSampleSize: 2,
      hasData: true,
      isAtRisk: true,
      thresholdApplied: 74,
      lastComputedAt: '2026-03-31T10:00:00.000Z',
    },
    {
      classId: 'class-sci',
      class: {
        id: 'class-sci',
        subjectName: 'Science',
        subjectCode: 'SCI',
        section: null,
      },
      assessmentAverage: 83,
      classRecordAverage: 82,
      blendedScore: 82.5,
      assessmentSampleSize: 5,
      classRecordSampleSize: 3,
      hasData: true,
      isAtRisk: false,
      thresholdApplied: 74,
      lastComputedAt: '2026-03-31T10:00:00.000Z',
    },
  ];

  const classes = options?.classes
    ? options.classes.map((override, index) => ({
        ...baseClasses[index % baseClasses.length],
        ...override,
      }))
    : baseClasses;

  return {
    student: {
      id: 'student-1',
      firstName: 'Kira',
      lastName: 'Jose',
      email: 'kira@example.com',
    },
    threshold: 74,
    classes,
    overall: {
      totalClasses: classes.length,
      classesWithData: classes.filter((entry) => entry.hasData).length,
      atRiskClasses: options?.atRiskClasses ?? classes.filter((entry) => entry.isAtRisk).length,
      averageBlendedScore:
        options?.averageBlendedScore !== undefined
          ? options.averageBlendedScore
          : classes.length
            ? 75.3
            : null,
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('StudentPerformancePage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders loading skeleton then performance sections', async () => {
    const pending = deferred<{ data: StudentOwnPerformanceSummary }>();
    mockedPerformanceService.getStudentOwnSummary.mockReturnValue(pending.promise);

    const { container } = render(<StudentPerformancePage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    pending.resolve({ data: buildSummary() });

    expect(await screen.findByRole('heading', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quarterly Trend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject Breakdown' })).toBeInTheDocument();
  });

  it('shows risk alert when at-risk subjects exist and hides it when there are none', async () => {
    mockedPerformanceService.getStudentOwnSummary.mockResolvedValue({
      data: buildSummary({ atRiskClasses: 2 }),
    });

    const { unmount } = render(<StudentPerformancePage />);

    expect(
      await screen.findByText('You have 2 subject(s) that need attention'),
    ).toBeInTheDocument();

    mockedPerformanceService.getStudentOwnSummary.mockResolvedValue({
      data: buildSummary({
        atRiskClasses: 0,
        classes: [
          {
            classId: 'class-math',
            isAtRisk: false,
            blendedScore: 84,
            assessmentAverage: 84,
            classRecordAverage: 84,
          },
          {
            classId: 'class-sci',
            isAtRisk: false,
            blendedScore: 87,
            assessmentAverage: 87,
            classRecordAverage: 87,
          },
        ],
      }),
    });

    unmount();
    render(<StudentPerformancePage />);

    await waitFor(() => {
      expect(screen.queryByText(/subject\(s\) that need attention/i)).not.toBeInTheDocument();
    });
  });

  it('shows empty states when no class scores are available', async () => {
    mockedPerformanceService.getStudentOwnSummary.mockResolvedValue({
      data: buildSummary({ classes: [], atRiskClasses: 0, averageBlendedScore: null }),
    });

    render(<StudentPerformancePage />);

    expect(await screen.findByText('No subject scores yet')).toBeInTheDocument();
    expect(screen.getByText('Quarterly trend unavailable')).toBeInTheDocument();
    expect(screen.getByText('No performance data yet')).toBeInTheDocument();
  });

  it('renders fallback surface when summary loading fails', async () => {
    mockedPerformanceService.getStudentOwnSummary.mockRejectedValue(new Error('network error'));

    render(<StudentPerformancePage />);

    expect(
      await screen.findByText("We couldn't load your performance summary"),
    ).toBeInTheDocument();
    expect(screen.getByText('Try refreshing this page in a moment.')).toBeInTheDocument();
  });
});
