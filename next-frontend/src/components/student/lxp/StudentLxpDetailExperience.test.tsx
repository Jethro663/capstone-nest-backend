import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

jest.mock('@/services/ja-service', () => ({
  jaService: {
    getHub: jest.fn().mockResolvedValue({
      data: {
        review: {
          eligibleAttempts: [],
        },
      },
    }),
  },
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

import StudentLxpDetailExperience from './StudentLxpDetailExperience';
import { lxpService } from '@/services/lxp-service';
import { healthService } from '@/services/health-service';
import { jaService } from '@/services/ja-service';

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;

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
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedLxpService.getOverview.mockResolvedValue(overviewResponse as never);
    mockedLxpService.getPlaylist.mockResolvedValue(activePlaylistResponse as never);
    mockedLxpService.completeCheckpoint.mockResolvedValue(activePlaylistResponse as never);
    (jaService.getHub as jest.Mock).mockResolvedValue({ data: { review: { eligibleAttempts: [] } } });
  });

  it('defaults to Assigned Steps and renders the four path workspace tabs only', async () => {
    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText('Mathematics 7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guided Review' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assessment Retry Support' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Why This Path Opened' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Progress & Support Status' })).toBeInTheDocument();
    expect(screen.queryByText('JA Hub')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guided Review' })).toBeInTheDocument();
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

  it('does not show an outside Mark Complete action for generated remedial lesson cards', async () => {
    mockedLxpService.getPlaylist.mockResolvedValue({
      data: {
        ...activePlaylistResponse.data,
        progress: {
          ...activePlaylistResponse.data.progress,
          checkpointsCompleted: 0,
          completionPercent: 0,
        },
        checkpoints: [
          {
            id: 'checkpoint-generated-lesson',
            type: 'generated_lesson_review',
            label: 'Simplified Remedial Lesson',
            order: 1,
            isCompleted: false,
            completedAt: null,
            xpAwarded: 20,
            lesson: null,
            assessment: null,
            generatedLesson: {
              id: 'generated-lesson-1',
              title: 'Simplified Remedial Lesson',
              summary: 'Review the weak concept in simpler terms.',
              lessonBody: 'Read this inside the generated lesson viewer.',
              weakConcepts: ['Equivalent fractions'],
              sourceLessonIds: ['lesson-1'],
              sourceReferences: [],
              status: 'approved',
            },
          },
        ],
      },
    } as never);

    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText('Simplified Remedial Lesson')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Remedial Lesson' })).toHaveAttribute(
      'href',
      '/dashboard/student/lxp/class-active/generated-lessons/checkpoint-generated-lesson',
    );
    expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
  });

  it('shows submitted AI Plan assessment tries and score indicators', async () => {
    searchParamsState.tab = 'replays';
    mockedLxpService.getPlaylist.mockResolvedValue({
      data: {
        ...activePlaylistResponse.data,
        checkpoints: [
          {
            id: 'checkpoint-guided',
            type: 'guided_assessment',
            label: 'AI Plan Quiz',
            order: 1,
            isCompleted: false,
            completedAt: null,
            xpAwarded: 30,
            lesson: null,
            assessment: null,
            guidedAssessment: {
              id: 'guided-1',
              title: 'Fractions Recovery Quiz',
              description: 'Answer the AI-generated quiz.',
              weakConcepts: ['Fractions'],
              sourceAssessmentId: 'assessment-1',
              sourceReferences: [],
              formativeSummary: null,
              questions: [],
              status: 'approved',
            },
            guidedAttemptSummary: {
              maxAttempts: 3,
              attemptsUsed: 2,
              remainingAttempts: 1,
              canRetry: true,
              isLocked: false,
              passingScore: 75,
              passed: false,
              bestAttemptId: 'attempt-2',
              bestScorePercent: 68,
              latestScorePercent: 68,
              attempts: [
                {
                  id: 'attempt-1',
                  attemptNumber: 1,
                  status: 'submitted',
                  scorePercent: 54,
                  correctCount: 3,
                  totalQuestions: 6,
                },
                {
                  id: 'attempt-2',
                  attemptNumber: 2,
                  status: 'submitted',
                  scorePercent: 68,
                  correctCount: 4,
                  totalQuestions: 6,
                },
              ],
            },
          },
        ],
      },
    } as never);

    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText('AI Plan Quiz')).toBeInTheDocument();
    expect(screen.getByText('2/3 submitted')).toBeInTheDocument();
    expect(screen.getByText('Try 1: 54%')).toBeInTheDocument();
    expect(screen.getByText('Try 2: 68%')).toBeInTheDocument();
    expect(screen.getByText('Try 3: Not taken')).toBeInTheDocument();
    expect(screen.getByText(/Best score: 68%/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retry Guided Assessment' })).toHaveAttribute(
      'href',
      '/dashboard/student/lxp/class-active/guided-assessment/checkpoint-guided',
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

  it('shows an AI outage banner but keeps lessons and replay handoff links available', async () => {
    searchParamsState.tab = 'replays';
    mockedHealthService.getReadiness.mockResolvedValueOnce({
      ready: false,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: {
          ok: false,
          message: 'connect ECONNREFUSED',
        },
      },
    });

    render(<StudentLxpDetailExperience />);

    expect(await screen.findByText(/JA is taking a break/i)).toBeInTheDocument();
    const jaLink = await screen.findByRole('link', { name: 'Open JA Hub' });
    expect(jaLink).toHaveAttribute(
      'href',
      '/dashboard/student/ja?mode=review&classId=class-active&entry=lxp&returnTo=%2Fdashboard%2Fstudent%2Flxp%2Fclass-active%3Ftab%3Dreplays',
    );
  });

  it('explains why the path opened', async () => {
    searchParamsState.tab = 'case';

    render(<StudentLxpDetailExperience />);

    expect(await screen.findByRole('heading', { name: 'Why This Path Opened' })).toBeInTheDocument();
    expect(screen.getByText(/this support path opened because your class performance dropped below the threshold/i)).toBeInTheDocument();
    expect(screen.getByText('Current score')).toBeInTheDocument();
  });

  it('explains how assessment retry support should be used', async () => {
    searchParamsState.tab = 'replays';
    render(<StudentLxpDetailExperience />);

    expect(await screen.findByRole('heading', { name: 'Assessment Retry Support' })).toBeInTheDocument();
    expect(screen.getByText(/complete guided review first, then open ja for the assessment retry/i)).toBeInTheDocument();
    expect(screen.getByText(/guided support, not a new official summative attempt/i)).toBeInTheDocument();
  });
});
