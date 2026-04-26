import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentJaWorkspace from './StudentJaWorkspace';
import { jaService } from '@/services/ja-service';

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    article: ({ children, className }: { children: ReactNode; className?: string }) => (
      <article className={className}>{children}</article>
    ),
    aside: ({ children, className }: { children: ReactNode; className?: string }) => (
      <aside className={className}>{children}</aside>
    ),
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    section: ({ children, className }: { children: ReactNode; className?: string }) => (
      <section className={className}>{children}</section>
    ),
  },
  useReducedMotion: () => true,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/ja-service', () => ({
  jaService: {
    getHub: jest.fn(),
    getAskThread: jest.fn(),
    getSession: jest.fn(),
    getReviewSession: jest.fn(),
  },
}));

const mockedJaService = jaService as jest.Mocked<typeof jaService>;

const hubResponse = {
  data: {
    classes: [
      {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        sectionName: 'Rizal',
        gradeLevel: '10',
      },
      {
        id: 'class-2',
        subjectName: 'Science',
        subjectCode: 'SCI',
        sectionName: 'Bonifacio',
        gradeLevel: '10',
      },
    ],
    selectedClassId: 'class-1',
    progress: {
      xpTotal: 25,
      streakDays: 2,
      sessionsCompleted: 1,
      lastActivityAt: null,
    },
    mastery: {
      classId: 'class-1',
      percent: 60,
      label: 'Growing',
    },
    badges: [],
    practice: {
      classes: [],
      selectedClassId: 'class-1',
      recommendations: [
        {
          id: 'rec-1',
          title: 'Fractions focus',
          reason: 'Fractions need review.',
          focusText: 'Equivalent fractions',
        },
      ],
      recentLessons: [],
      recentAttempts: [],
      sessions: [
        {
          id: 'practice-1',
          status: 'active',
          currentIndex: 2,
          questionCount: 10,
          strikeCount: 0,
          rewardState: 'pending',
          groundingStatus: 'grounded',
          startedAt: '2026-04-25T10:00:00.000Z',
          completedAt: null,
        },
      ],
      progress: null,
    },
    ask: {
      threads: [
        {
          id: 'thread-1',
          title: 'Fractions explanation',
          status: 'active',
          updatedAt: '2026-04-25T11:00:00.000Z',
          lastMessageAt: '2026-04-25T11:00:00.000Z',
        },
      ],
    },
    review: {
      eligibleAttempts: [
        {
          attemptId: 'attempt-1',
          assessmentId: 'assessment-1',
          assessmentTitle: 'Fractions Quiz',
          submittedAt: '2026-04-24T08:00:00.000Z',
          score: 62,
          passed: false,
        },
      ],
      sessions: [
        {
          id: 'review-1',
          status: 'completed',
          currentIndex: 10,
          questionCount: 10,
          strikeCount: 0,
          rewardState: 'awarded',
          groundingStatus: 'grounded',
          startedAt: '2026-04-24T09:00:00.000Z',
          completedAt: '2026-04-24T09:30:00.000Z',
        },
      ],
    },
  },
};

describe('StudentJaWorkspace refactored shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedJaService.getHub.mockResolvedValue(hubResponse as never);
    mockedJaService.getAskThread.mockResolvedValue({
      data: {
        thread: {
          id: 'thread-1',
          classId: 'class-1',
          title: 'Fractions explanation',
          status: 'active',
        },
        messages: [],
      },
    } as never);
  });

  it('opens to a mode-first JA home from the sidebar route', async () => {
    render(<StudentJaWorkspace initialEntry="sidebar" />);

    expect(await screen.findByRole('heading', { name: 'How do you want JA to help?' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Ask/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Practice/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Replay/i }).length).toBeGreaterThan(0);
  });

  it('shows contextual class lock and return action for class-launched Ask', async () => {
    render(
      <StudentJaWorkspace
        initialMode="ask"
        initialClassId="class-1"
        initialEntry="class"
        returnTo="/dashboard/student/classes/class-1"
      />,
    );

    expect(await screen.findByText('Class locked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to class/i })).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1',
    );
    expect(screen.queryByText(/replay-ready attempt/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Current class')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Class selector/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change class/i }));
    expect(screen.getByRole('button', { name: /Class selector/i })).toBeInTheDocument();
  });

  it('uses the selected class label as the top-left class picker trigger', async () => {
    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    const trigger = await screen.findByRole('button', { name: /Class selector/i });
    expect(trigger).toHaveTextContent('Mathematics (MATH)');

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox', { name: /Class options/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Science \(SCI\)/i })).toBeInTheDocument();
  });

  it('reopens the activity history after collapsing it', async () => {
    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Hide activity history/i }));
    expect(screen.queryByText('Activity history')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show activity history/i }));
    expect(await screen.findByText('Activity history')).toBeInTheDocument();
  });

  it('renders one unified activity rail across Ask, Practice, and Replay', async () => {
    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    expect(await screen.findByRole('button', { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ask$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Practice$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Replay$/i })).toBeInTheDocument();
    expect(screen.getByText('Fractions explanation')).toBeInTheDocument();
    expect(screen.getByText('Practice Mission')).toBeInTheDocument();
    expect(screen.getByText('Assessment Replay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Replay$/i }));
    await waitFor(() => {
      expect(screen.queryByText('Fractions explanation')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Assessment Replay')).toBeInTheDocument();
  });
});
