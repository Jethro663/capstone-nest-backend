import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentLxpDetailExperience from './StudentLxpDetailExperience';
import { lxpService } from '@/services/lxp-service';

const push = jest.fn();
const replace = jest.fn();
const searchParamsState: Record<string, string | null> = {
  tab: null,
};
let routeClassId = 'class-active';

jest.mock('next/navigation', () => ({
  useParams: () => ({ classId: routeClassId }),
  usePathname: () => `/dashboard/student/lxp/${routeClassId}`,
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

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

const overviewResponse = {
  data: {
    selectedClass: {
      classId: 'class-active',
      subjectName: 'Mathematics 7',
      subjectCode: 'MATH-7',
      section: {
        id: 'section-1',
        name: 'Section A',
        gradeLevel: '7',
      },
      blendedScore: 62,
      thresholdApplied: 74,
      lastComputedAt: '2026-04-20T00:00:00.000Z',
    },
    interventionStatus: {
      caseId: 'case-active',
      status: 'active',
      code: 'needs_attention',
      label: 'Needs attention',
      message: 'Focus needed',
      openedAt: '2026-04-20T00:00:00.000Z',
      closedAt: null,
      triggerScore: 62,
      thresholdApplied: 74,
    },
    progress: {
      xpTotal: 10,
      starsTotal: 0,
      streakDays: 1,
      checkpointsCompleted: 0,
      totalCheckpoints: 2,
      completionPercent: 0,
      lastActivityAt: null,
    },
    subjectMastery: [],
    recommendedAction: null,
    upcomingAssessments: [],
    recentActivity: [],
    weakFocusItems: [],
  },
};

const activePlaylistResponse = {
  data: {
    interventionCase: {
      id: 'case-active',
      status: 'active',
      openedAt: '2026-04-20T00:00:00.000Z',
      closedAt: null,
      thresholdApplied: 74,
      triggerScore: 62,
    },
    progress: {
      xpTotal: 10,
      starsTotal: 0,
      streakDays: 1,
      checkpointsCompleted: 0,
      completionPercent: 0,
    },
    checkpoints: [
      {
        id: 'checkpoint-lesson',
        type: 'lesson_review',
        label: 'Review Fractions',
        order: 1,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 20,
        lesson: {
          id: 'lesson-1',
          title: 'Fractions',
          description:
            '<p><strong>Review</strong> the assigned fractions lesson.</p><p>Focus on equivalent fractions and visual models.</p>',
          order: 1,
        },
        assessment: null,
      },
      {
        id: 'checkpoint-replay',
        type: 'assessment_retry',
        label: 'Replay Fractions Quiz',
        order: 2,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 30,
        lesson: null,
        assessment: {
          id: 'assessment-1',
          title: 'Fractions Quiz',
          type: 'quiz',
          description: '<p><strong>Retry</strong> the fractions quiz.</p>',
          passingScore: 75,
          dueDate: '2026-04-30T00:00:00.000Z',
        },
      },
    ],
  },
};

describe('StudentLxpDetailExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routeClassId = 'class-active';
    searchParamsState.tab = null;
    mockedLxpService.getOverview.mockResolvedValue(overviewResponse as never);
    mockedLxpService.getPlaylist.mockResolvedValue(activePlaylistResponse as never);
    mockedLxpService.completeCheckpoint.mockResolvedValue(activePlaylistResponse as never);
  });

  it('defaults to Assigned Steps and renders the four path workspace tabs only', async () => {
    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText('Mathematics 7')).toBeInTheDocument();
    expect(screen.getByText('Assigned Steps')).toBeInTheDocument();
    expect(screen.getByText('Replays')).toBeInTheDocument();
    expect(screen.getByText('Case File')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.queryByText('JA Hub')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assigned Steps' })).toBeInTheDocument();
  });

  it('routes assessment replays to the standalone JA page', async () => {
    searchParamsState.tab = 'replays';

    render(<StudentLxpDetailExperience />);

    await screen.findByText('Replay Fractions Quiz');

    const jaLink = await screen.findByRole('link', { name: 'Open JA Hub' });
    expect(jaLink).toHaveAttribute(
      'href',
      '/dashboard/student/ja?mode=review&classId=class-active&entry=lxp&returnTo=%2Fdashboard%2Fstudent%2Flxp%2Fclass-active%3Ftab%3Dreplays',
    );
  });

  it('opens the lesson when the step card itself is clicked', async () => {
    render(<StudentLxpDetailExperience />);

    const lessonCard = (await screen.findByText('Review Fractions')).closest('article');
    expect(lessonCard).not.toBeNull();

    fireEvent.click(lessonCard!);

    expect(push).toHaveBeenCalledWith(
      '/dashboard/student/lessons/lesson-1?returnTo=%2Fdashboard%2Fstudent%2Flxp%2Fclass-active',
    );
  });

  it('opens JA review when the replay card itself is clicked', async () => {
    searchParamsState.tab = 'replays';

    render(<StudentLxpDetailExperience />);

    const replayCard = (await screen.findByText('Replay Fractions Quiz')).closest('article');
    expect(replayCard).not.toBeNull();

    fireEvent.click(replayCard!);

    expect(push).toHaveBeenCalledWith(
      '/dashboard/student/ja?mode=review&classId=class-active&entry=lxp&returnTo=%2Fdashboard%2Fstudent%2Flxp%2Fclass-active%3Ftab%3Dreplays',
    );
  });

  it('shows only checkpoint titles in the card and hides lesson body content', async () => {
    render(<StudentLxpDetailExperience />);

    const lessonCard = (await screen.findByText('Review Fractions')).closest('article');
    expect(lessonCard).not.toBeNull();
    expect(lessonCard).toHaveTextContent('Review Fractions');
    expect(lessonCard).not.toHaveTextContent('Review the assigned fractions lesson.');
    expect(lessonCard).not.toHaveTextContent('Focus on equivalent fractions and visual models.');
    expect(lessonCard).not.toHaveTextContent('Retry the fractions quiz.');
  });

  it('keeps completed paths read-only even if historical checkpoints are incomplete', async () => {
    mockedLxpService.getOverview.mockResolvedValue({
      data: {
        ...overviewResponse.data,
        interventionStatus: {
          ...overviewResponse.data.interventionStatus,
          status: 'completed',
          code: 'on_track',
          label: 'Completed',
          closedAt: '2026-04-21T00:00:00.000Z',
        },
        progress: {
          ...overviewResponse.data.progress,
          completionPercent: 100,
        },
      },
    } as never);
    mockedLxpService.getPlaylist.mockResolvedValue({
      data: {
        ...activePlaylistResponse.data,
        interventionCase: {
          ...activePlaylistResponse.data.interventionCase,
          status: 'completed',
          closedAt: '2026-04-21T00:00:00.000Z',
        },
      },
    } as never);

    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText('Completed')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Read-only history')).toBeInTheDocument();
  });
});
