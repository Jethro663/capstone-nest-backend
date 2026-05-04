import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentLxpExperience from './StudentLxpExperience';
import { lxpService } from '@/services/lxp-service';
import { healthService } from '@/services/health-service';

const push = jest.fn();
const replace = jest.fn();
const searchParamsState: Record<string, string | null> = {
  tab: null,
  mode: null,
  classId: null,
};

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/student/lxp',
  useRouter: () => ({ push, replace }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsState[key] ?? null,
    toString: () => '',
  }),
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getEligibility: jest.fn(),
    getOverview: jest.fn(),
    getPlaylist: jest.fn(),
    completeCheckpoint: jest.fn(),
    submitEvaluation: jest.fn(),
  },
}));

jest.mock('@/services/health-service', () => ({
  healthService: {
    getReadiness: jest.fn(),
  },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;

const eligibilityResponse = {
  data: {
    threshold: 74,
    eligibleClasses: [
      {
        classId: 'class-active',
        class: {
          id: 'class-active',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          section: {
            id: 'section-1',
            name: 'Section A',
            gradeLevel: '7',
          },
        },
        interventionCaseId: 'case-active',
        isAtRisk: true,
        blendedScore: 62,
        thresholdApplied: 74,
        openedAt: '2026-04-20T00:00:00.000Z',
      },
    ],
    paths: [
      {
        classId: 'class-active',
        class: {
          id: 'class-active',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          section: {
            id: 'section-1',
            name: 'Section A',
            gradeLevel: '7',
          },
        },
        interventionCaseId: 'case-active',
        status: 'active',
        isAtRisk: true,
        blendedScore: 62,
        thresholdApplied: 74,
        openedAt: '2026-04-20T00:00:00.000Z',
        closedAt: null,
        counts: {
          steps: 1,
          replays: 1,
          pending: 1,
          total: 2,
          completed: 1,
        },
        progress: {
          totalCheckpoints: 2,
          completedCheckpoints: 1,
          completionPercent: 50,
        },
      },
      {
        classId: 'class-completed',
        class: {
          id: 'class-completed',
          subjectName: 'Science 7',
          subjectCode: 'SCI-7',
          section: {
            id: 'section-1',
            name: 'Section A',
            gradeLevel: '7',
          },
        },
        interventionCaseId: 'case-completed',
        status: 'completed',
        isAtRisk: false,
        blendedScore: 86,
        thresholdApplied: 74,
        openedAt: '2026-04-01T00:00:00.000Z',
        closedAt: '2026-04-08T00:00:00.000Z',
        counts: {
          steps: 1,
          replays: 1,
          pending: 0,
          total: 2,
          completed: 2,
        },
        progress: {
          totalCheckpoints: 2,
          completedCheckpoints: 2,
          completionPercent: 100,
        },
      },
    ],
  },
};

describe('StudentLxpExperience path list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsState.tab = null;
    searchParamsState.mode = null;
    searchParamsState.classId = null;
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedLxpService.getEligibility.mockResolvedValue(eligibilityResponse as never);
  });

  it('renders the courses-style Learners Path list without the old class dropdown or JA tab', async () => {
    render(<StudentLxpExperience />);

    expect(
      await screen.findByPlaceholderText('Search path, section, or subject code'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/opens only for remediation-eligible learners below the support threshold/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/each support path helps you review guided steps and assessment retries/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Paths' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByText('Mathematics 7')).toBeInTheDocument();
    expect(screen.getByText('Science 7')).toBeInTheDocument();
    expect(screen.getAllByText('Guided Review')).toHaveLength(2);
    expect(screen.getAllByText('Assessment Retry')).toHaveLength(2);
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('JA Hub')).not.toBeInTheDocument();
  });

  it('filters completed paths by checkpoint progress', async () => {
    render(<StudentLxpExperience />);

    await screen.findByText('Mathematics 7');
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));

    expect(screen.queryByText('Mathematics 7')).not.toBeInTheDocument();
    expect(screen.getByText('Science 7')).toBeInTheDocument();
  });

  it('opens a path detail route from the primary card action', async () => {
    render(<StudentLxpExperience />);

    await screen.findByText('Mathematics 7');
    fireEvent.click(screen.getByRole('button', { name: 'Continue Path' }));

    expect(push).toHaveBeenCalledWith('/dashboard/student/lxp/class-active');
  });

  it('redirects old embedded JA links to the standalone JA page', async () => {
    searchParamsState.tab = 'ja';
    searchParamsState.mode = 'ask';
    searchParamsState.classId = 'class-active';

    render(<StudentLxpExperience />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        '/dashboard/student/ja?mode=ask&classId=class-active&entry=lxp&returnTo=%2Fdashboard%2Fstudent%2Flxp',
      );
    });
  });

  it('shows an AI outage banner while keeping path navigation available', async () => {
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

    render(<StudentLxpExperience />);

    expect(await screen.findByText(/JA is taking a break/i)).toBeInTheDocument();
    expect(screen.getByText(/replay help may be paused/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue Path' }));
    expect(push).toHaveBeenCalledWith('/dashboard/student/lxp/class-active');
  });

  it('opens the student help guide, walks through all pages, and closes it', async () => {
    render(<StudentLxpExperience />);

    await screen.findByText('Mathematics 7');
    fireEvent.click(screen.getByRole('button', { name: /learners path help/i }));

    expect(await screen.findByText('Student guide: Learners Path')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Start on the page and know what it is for')).toBeInTheDocument();
    expect(screen.getByText('Help button')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('Find the right path faster')).toBeInTheDocument();
    expect(screen.getAllByText('Reset Filters')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
    expect(screen.getByText('Read a path card')).toBeInTheDocument();
    expect(screen.getByText('Status badge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 4 of 5')).toBeInTheDocument();
    expect(screen.getByText('Choose the action you need')).toBeInTheDocument();
    expect(screen.getByText('Continue or Review')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 5 of 5')).toBeInTheDocument();
    expect(screen.getByText('Know the special notices on this page')).toBeInTheDocument();
    expect(screen.getByText('JA break banner')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText('Page 4 of 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close guide/i }));
    await waitFor(() => {
      expect(screen.queryByText('Student guide: Learners Path')).not.toBeInTheDocument();
    });
  });
});
