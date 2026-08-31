'use client';

import { render, screen, waitFor } from '@testing-library/react';
import StudentGeneratedLessonPage from './page';
import { lxpService } from '@/services/lxp-service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ classId: 'class-1', assignmentId: 'assignment-1' }),
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getGeneratedLesson: jest.fn(),
    getPlaylist: jest.fn(),
    completeCheckpoint: jest.fn(),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({
    html,
    className,
  }: {
    html: string;
    className?: string;
  }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe('StudentGeneratedLessonPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpService.getGeneratedLesson.mockResolvedValue({
      success: true,
      data: {
        assignmentId: 'assignment-1',
        caseId: 'case-1',
        status: 'assigned',
        checkpointLabel: 'AI remedial lesson',
        generatedLesson: {
          id: 'generated-lesson-1',
          title: 'Simplified remedial lesson',
          summary: 'A simpler review grounded on class materials.',
          lessonBody:
            '## What You Need To Focus On\n\nWe will review one weak concept at a time.\n\n### Weak concepts\n- Elements are represented by symbols\n\n### Simple review guide\n1. Read the idea slowly.\n2. Compare your choices before you submit.',
          weakConcepts: ['Elements'],
          sourceReferences: [{ title: 'Lesson 1: Elements and Compounds' }],
        },
      },
    } as Awaited<ReturnType<typeof lxpService.getGeneratedLesson>>);
    mockedLxpService.getPlaylist.mockResolvedValue({
      data: {
        interventionCase: {
          id: 'case-1',
          status: 'active',
          openedAt: '2026-05-01T00:00:00.000Z',
          thresholdApplied: 74,
          triggerScore: 61,
        },
        progress: {
          xpTotal: 0,
          starsTotal: 0,
          streakDays: 0,
          checkpointsCompleted: 0,
          completionPercent: 0,
        },
        checkpoints: [
          {
            id: 'assignment-1',
            type: 'generated_lesson_review',
            label: 'AI remedial lesson',
            order: 1,
            isCompleted: false,
            completedAt: null,
            xpAwarded: 20,
          },
        ],
      },
    } as Awaited<ReturnType<typeof lxpService.getPlaylist>>);
  });

  it('renders generated lesson content through the normal student lesson shell instead of raw markdown text', async () => {
    const { container } = render(<StudentGeneratedLessonPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Simplified remedial lesson' }),
      ).toBeInTheDocument();
    });

    expect(container.querySelector('.student-module-view')).toBeInTheDocument();
    expect(
      container.querySelector('.student-module-view__reader'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'What You Need To Focus On' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Elements are represented by symbols'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/## What You Need To Focus On/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
  });
});
