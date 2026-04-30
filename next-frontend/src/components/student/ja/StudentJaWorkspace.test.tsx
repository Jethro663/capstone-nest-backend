import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentJaWorkspace from './StudentJaWorkspace';
import { jaService } from '@/services/ja-service';
import { healthService } from '@/services/health-service';
import { toast } from 'sonner';

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
    createSession: jest.fn(),
    createAskThread: jest.fn(),
    createReviewSession: jest.fn(),
    sendAskMessage: jest.fn(),
    submitResponse: jest.fn(),
    submitReviewResponse: jest.fn(),
    completeSession: jest.fn(),
    completeReviewSession: jest.fn(),
  },
}));

jest.mock('@/services/health-service', () => ({
  healthService: {
    getReadiness: jest.fn(),
  },
}));

const mockedJaService = jaService as jest.Mocked<typeof jaService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;

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
          contextLessonId: 'lesson-1',
          contextLessonTitle: 'Adding Fractions',
          contextModuleTitle: 'Module 1',
          contextSectionTitle: 'Lesson Set A',
        },
      ],
      lessonContexts: [
        {
          lessonId: 'lesson-1',
          title: 'Adding Fractions',
          moduleTitle: 'Module 1',
          sectionTitle: 'Lesson Set A',
        },
        {
          lessonId: 'lesson-2',
          title: 'Equivalent Fractions',
          moduleTitle: 'Module 1',
          sectionTitle: 'Lesson Set B',
        },
      ],
      guidelines: [
        'Pick a visible lesson first when you want a summary, explanation, or study plan.',
        'Ask for concept help, quick reviews, what to study next, or a short lesson recap.',
        'JA blocks requests that jump to unrelated subjects or ask for direct answer keys.',
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
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: '2026-04-30T00:00:00.000Z',
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedJaService.getHub.mockResolvedValue(hubResponse as never);
    mockedJaService.getAskThread.mockResolvedValue({
      data: {
        thread: {
          id: 'thread-1',
          classId: 'class-1',
          title: 'Fractions explanation',
          status: 'active',
          contextLessonId: 'lesson-1',
          contextLessonTitle: 'Adding Fractions',
          contextModuleTitle: 'Module 1',
          contextSectionTitle: 'Lesson Set A',
        },
        messages: [],
      },
    } as never);
    mockedJaService.getReviewSession.mockResolvedValue({
      data: {
        session: {
          id: 'review-1',
          classId: 'class-1',
          mode: 'review',
          status: 'completed',
          currentIndex: 2,
          questionCount: 2,
          strikeCount: 0,
          rewardState: 'awarded',
          groundingStatus: 'grounded',
          startedAt: '2026-04-24T09:00:00.000Z',
          completedAt: '2026-04-24T09:30:00.000Z',
        },
        items: [
          {
            id: 'item-1',
            orderIndex: 0,
            itemType: 'multiple_choice',
            prompt: '<p>If A = {1, 2} and B = {2, 3}, what is A ∩ B?</p>\n\nJA Coach: You missed this before. Watch the overlap.',
            options: [
              { id: 'a', text: '<p>{1}</p>', order: 0 },
              { id: 'b', text: '<p>{2}</p>', order: 1 },
            ],
            hint: 'Review the shared elements before choosing.',
            response: {
              id: 'response-1',
              studentAnswer: { selectedOptionId: 'b' },
              isCorrect: true,
              scoreDelta: 1,
              feedback: 'Correct.',
              answeredAt: '2026-04-24T09:05:00.000Z',
            },
          },
          {
            id: 'item-2',
            orderIndex: 1,
            itemType: 'multiple_choice',
            prompt: '<p>Which number is even?</p>',
            options: [
              { id: 'c', text: '<p>3</p>', order: 0 },
              { id: 'd', text: '<p>4</p>', order: 1 },
            ],
            hint: 'Look for a number divisible by 2.',
            response: {
              id: 'response-2',
              studentAnswer: { selectedOptionId: 'd' },
              isCorrect: true,
              scoreDelta: 1,
              feedback: 'Correct.',
              answeredAt: '2026-04-24T09:10:00.000Z',
            },
          },
        ],
      },
    } as never);
    mockedJaService.createAskThread.mockResolvedValue({
      data: {
        thread: {
          id: 'thread-2',
          classId: 'class-2',
          title: 'JA Ask Thread',
          status: 'active',
          contextLessonId: null,
          contextLessonTitle: null,
          contextModuleTitle: null,
          contextSectionTitle: null,
        },
        messages: [],
      },
    } as never);
    mockedJaService.sendAskMessage.mockResolvedValue({
      data: {
        thread: {
          id: 'thread-2',
          classId: 'class-2',
          title: 'JA Ask Thread',
          contextLessonId: null,
          contextLessonTitle: null,
          contextModuleTitle: null,
          contextSectionTitle: null,
        },
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Use your lesson notes.',
          blocked: false,
          createdAt: '2026-04-26T09:00:00.000Z',
        },
        blocked: false,
      },
    } as never);
    mockedJaService.createReviewSession.mockResolvedValue({
      data: {
        session: {
          id: 'review-1',
          classId: 'class-1',
          mode: 'review',
          status: 'completed',
          currentIndex: 2,
          questionCount: 2,
          strikeCount: 0,
          rewardState: 'awarded',
          groundingStatus: 'grounded',
          startedAt: '2026-04-24T09:00:00.000Z',
          completedAt: '2026-04-24T09:30:00.000Z',
        },
        items: [
          {
            id: 'item-1',
            orderIndex: 0,
            itemType: 'multiple_choice',
            prompt: '<p>If A = {1, 2} and B = {2, 3}, what is A âˆ© B?</p>\n\nJA Coach: You missed this before. Watch the overlap.',
            options: [
              { id: 'a', text: '<p>{1}</p>', order: 0 },
              { id: 'b', text: '<p>{2}</p>', order: 1 },
            ],
            hint: 'Review the shared elements before choosing.',
            response: {
              id: 'response-1',
              studentAnswer: { selectedOptionId: 'b' },
              isCorrect: true,
              scoreDelta: 1,
              feedback: 'Correct.',
              answeredAt: '2026-04-24T09:05:00.000Z',
            },
          },
          {
            id: 'item-2',
            orderIndex: 1,
            itemType: 'multiple_choice',
            prompt: '<p>Which number is even?</p>',
            options: [
              { id: 'c', text: '<p>3</p>', order: 0 },
              { id: 'd', text: '<p>4</p>', order: 1 },
            ],
            hint: 'Look for a number divisible by 2.',
            response: {
              id: 'response-2',
              studentAnswer: { selectedOptionId: 'd' },
              isCorrect: true,
              scoreDelta: 1,
              feedback: 'Correct.',
              answeredAt: '2026-04-24T09:10:00.000Z',
            },
          },
        ],
      },
    } as never);
    mockedJaService.submitReviewResponse.mockResolvedValue(undefined as never);
  });

  it('opens to the closed Ask chatbot from the sidebar route', async () => {
    render(<StudentJaWorkspace initialEntry="sidebar" />);

    expect(await screen.findByText(/Pick a visible lesson, then ask JA for help/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask JA about this lesson/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask JA anything/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Explain this topic in simpler words/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Ask/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Practice/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Replay/i }).length).toBeGreaterThan(0);
  });

  it('shows available lesson contexts and ask guidelines on an empty Ask chat', async () => {
    mockedJaService.getAskThread.mockResolvedValueOnce({
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

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    expect(await screen.findByText(/Pick a visible lesson, then ask JA for help/i)).toBeInTheDocument();
    expect(screen.getByText('Module 1 / Lesson Set A')).toBeInTheDocument();
    expect(screen.getByText('Module 1 / Lesson Set B')).toBeInTheDocument();
    expect(screen.getByText(/Good prompts for JA/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Pick a visible lesson first when you want a summary, explanation, or study plan/i),
    ).toBeInTheDocument();
  });

  it('opens the fixed Ask menu and shows the 9 preset lesson actions', async () => {
    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Ask JA about this lesson/i }));

    expect(screen.getByText('Explain the lesson')).toBeInTheDocument();
    expect(screen.getByText('Summarize main idea')).toBeInTheDocument();
    expect(screen.getByText('What should I study next?')).toBeInTheDocument();
    expect(screen.getByText('Give me a question')).toBeInTheDocument();
    expect(screen.getByText('Quiz me on this lesson')).toBeInTheDocument();
    expect(screen.getByText('Unclear parts check')).toBeInTheDocument();
    expect(screen.getByText('Key concepts review')).toBeInTheDocument();
    expect(screen.getByText('Make a study plan')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary review')).toBeInTheDocument();
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

  it('renders replay rich text, extracts coach copy, and navigates between replay items', async () => {
    render(<StudentJaWorkspace initialMode="review" initialClassId="class-1" />);

    fireEvent.click(await screen.findByText('Assessment Replay'));

    expect(await screen.findByText('If A = {1, 2} and B = {2, 3}, what is A ∩ B?')).toBeInTheDocument();
    expect(screen.queryByText(/<p>/)).not.toBeInTheDocument();
    expect(screen.getByText('You missed this before. Watch the overlap.')).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit Answer/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(await screen.findByText('Which number is even?')).toBeInTheDocument();
    expect(screen.getByText(/Question 2 of 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Previous$/i }));
    expect(await screen.findByText('If A = {1, 2} and B = {2, 3}, what is A ∩ B?')).toBeInTheDocument();
  });

  it('returns to the replay picker after leaving replay mode and coming back', async () => {
    render(<StudentJaWorkspace initialMode="review" initialClassId="class-1" />);

    fireEvent.click(await screen.findByText('Assessment Replay'));
    expect(await screen.findByText(/Question 1 of 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Practice Fresh objective checks/i }));
    expect(await screen.findByText('Start your next practice run')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Replay Revisit weak spots/i }));
    expect(await screen.findByText('Pick an assessment to replay')).toBeInTheDocument();
  });

  it('lets the user exit a selected replay back to the replay picker', async () => {
    render(<StudentJaWorkspace initialMode="review" initialClassId="class-1" />);

    fireEvent.click(await screen.findByText('Assessment Replay'));
    expect(await screen.findByText(/Question 1 of 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to replay menu/i }));
    expect(await screen.findByText('Pick an assessment to replay')).toBeInTheDocument();
  });

  it('enables replay submission only after every replay item has a draft answer', async () => {
    mockedJaService.createReviewSession.mockResolvedValueOnce({
      data: {
        session: {
          id: 'review-1',
          classId: 'class-1',
          mode: 'review',
          status: 'active',
          currentIndex: 0,
          questionCount: 2,
          strikeCount: 0,
          rewardState: 'pending',
          groundingStatus: 'grounded',
          startedAt: '2026-04-24T09:00:00.000Z',
          completedAt: null,
        },
        items: [
          {
            id: 'item-1',
            orderIndex: 0,
            itemType: 'multiple_choice',
            prompt: '<p>First replay item?</p>',
            options: [
              { id: 'a', text: '<p>A</p>', order: 0 },
              { id: 'b', text: '<p>B</p>', order: 1 },
            ],
            hint: 'Pick one.',
            response: null,
          },
          {
            id: 'item-2',
            orderIndex: 1,
            itemType: 'multiple_choice',
            prompt: '<p>Second replay item?</p>',
            options: [
              { id: 'c', text: '<p>C</p>', order: 0 },
              { id: 'd', text: '<p>D</p>', order: 1 },
            ],
            hint: 'Pick another.',
            response: null,
          },
        ],
      },
    } as never);

    render(<StudentJaWorkspace initialMode="review" initialClassId="class-1" />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Fractions Quiz.*Submitted.*62%/i,
      }),
    );
    expect(await screen.findByText(/Question 1 of 2/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit Answers/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'A' }));
    expect(screen.queryByRole('button', { name: /Submit Answers/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    const submitButton = await screen.findByRole('button', { name: /Submit Answers/i });
    expect(submitButton).toBeDisabled();

    fireEvent.click(await screen.findByRole('radio', { name: 'D' }));
    expect(screen.getByRole('button', { name: /Submit Answers/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Submit Answers/i }));

    await waitFor(() => {
      expect(mockedJaService.submitReviewResponse).toHaveBeenCalledTimes(2);
    });
    expect(mockedJaService.submitReviewResponse).toHaveBeenCalledWith('review-1', {
      itemId: 'item-1',
      answer: { selectedOptionId: 'a' },
    });
    expect(mockedJaService.submitReviewResponse).toHaveBeenCalledWith('review-1', {
      itemId: 'item-2',
      answer: { selectedOptionId: 'd' },
    });
  });

  it('clears stale ask lesson state when switching classes before sending', async () => {
    mockedJaService.getHub.mockImplementation((classId?: string) => {
      if (classId === 'class-2') {
        return Promise.resolve({
          data: {
            ...hubResponse.data,
            selectedClassId: 'class-2',
            ask: {
              ...hubResponse.data.ask,
              threads: [],
            },
          },
        }) as never;
      }
      return Promise.resolve(hubResponse) as never;
    });

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Class selector/i }));
    fireEvent.click(screen.getByRole('option', { name: /Science \(SCI\)/i }));
    await waitFor(() => expect(mockedJaService.getHub).toHaveBeenCalledWith('class-2'));

    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    fireEvent.click(screen.getByText('Explain the lesson'));

    expect(mockedJaService.createAskThread).not.toHaveBeenCalled();
    expect(mockedJaService.sendAskMessage).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Select a visible lesson first so JA can keep this help grounded/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Equivalent Fractions/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    fireEvent.click(screen.getByText('Explain the lesson'));

    await waitFor(() => {
      expect(mockedJaService.createAskThread).toHaveBeenCalledWith({
        classId: 'class-2',
        lessonId: 'lesson-2',
      });
    });
    expect(mockedJaService.sendAskMessage).toHaveBeenCalledWith('thread-2', {
      message: 'Explain the lesson',
      quickAction: 'Explain the lesson',
      lessonId: 'lesson-2',
    });
  });

  it('starts a fresh Ask thread after pressing New chat', async () => {
    mockedJaService.getAskThread.mockResolvedValueOnce({
      data: {
        thread: {
          id: 'thread-1',
          classId: 'class-1',
          title: 'Fractions explanation',
          status: 'active',
          contextLessonId: 'lesson-1',
          contextLessonTitle: 'Adding Fractions',
          contextModuleTitle: 'Module 1',
          contextSectionTitle: 'Lesson Set A',
        },
        messages: [
          {
            id: 'assistant-seeded',
            role: 'assistant',
            content: 'Previous thread response.',
            blocked: false,
          },
        ],
      },
    } as never);

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    expect(await screen.findByText('Previous thread response.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /New chat/i }));

    await waitFor(() => {
      expect(screen.queryByText('Previous thread response.')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Pick a visible lesson, then ask JA for help/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask JA about this lesson/i })).toBeInTheDocument();
    expect(screen.queryByText(/Current lesson/i)).not.toBeInTheDocument();
  });

  it('shows backend Ask error messages instead of a generic failure', async () => {
    mockedJaService.sendAskMessage.mockRejectedValueOnce({
      response: {
        data: {
          message: 'You need completed visible class material before using JA Ask.',
        },
      },
    });

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Equivalent Fractions/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    fireEvent.click(screen.getByText('Explain the lesson'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'You need completed visible class material before using JA Ask.',
      );
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You need completed visible class material before using JA Ask.',
    );
  });

  it('uses the selected lesson context when starting an Ask thread and sending a message', async () => {
    mockedJaService.getAskThread.mockResolvedValueOnce({
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
    mockedJaService.createAskThread.mockResolvedValueOnce({
      data: {
        thread: {
          id: 'thread-lesson',
          classId: 'class-1',
          title: 'Ask: Equivalent Fractions',
          status: 'active',
          contextLessonId: 'lesson-2',
          contextLessonTitle: 'Equivalent Fractions',
          contextModuleTitle: 'Module 1',
          contextSectionTitle: 'Lesson Set B',
        },
        messages: [],
      },
    } as never);
    mockedJaService.sendAskMessage.mockResolvedValueOnce({
      data: {
        thread: {
          id: 'thread-lesson',
          classId: 'class-1',
          title: 'Ask: Equivalent Fractions',
          contextLessonId: 'lesson-2',
          contextLessonTitle: 'Equivalent Fractions',
          contextModuleTitle: 'Module 1',
          contextSectionTitle: 'Lesson Set B',
        },
        message: {
          id: 'assistant-lesson',
          role: 'assistant',
          content: 'Equivalent fractions are different forms of the same value.',
          blocked: false,
          createdAt: '2026-04-26T10:00:00.000Z',
        },
        blocked: false,
      },
    } as never);

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Equivalent Fractions/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    fireEvent.click(screen.getByText('Summarize main idea'));

    await waitFor(() => {
      expect(mockedJaService.createAskThread).toHaveBeenCalledWith({
        classId: 'class-1',
        lessonId: 'lesson-2',
      });
    });
    expect(mockedJaService.sendAskMessage).toHaveBeenCalledWith('thread-lesson', {
      message: 'Summarize main idea',
      quickAction: 'Summarize main idea',
      lessonId: 'lesson-2',
    });
    expect(
      await screen.findByText(/Equivalent fractions are different forms of the same value/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Current lesson/i)).toBeInTheDocument();
    expect(screen.getAllByText('Equivalent Fractions').length).toBeGreaterThan(0);
  });

  it('keeps Ask sends local instead of reloading the whole hub', async () => {
    mockedJaService.getAskThread.mockResolvedValueOnce({
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

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    await screen.findByText(/Pick a visible lesson, then ask JA for help/i);

    fireEvent.click(screen.getByRole('button', { name: /Equivalent Fractions/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    fireEvent.click(screen.getByText('Make a study plan'));

    await waitFor(() => {
      expect(mockedJaService.sendAskMessage).toHaveBeenCalledTimes(1);
    });
    expect(mockedJaService.getHub).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Preparing JA Hub/i)).not.toBeInTheDocument();
  });

  it('shows a view-only outage state and keeps history usable when AI is degraded', async () => {
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

    render(<StudentJaWorkspace initialMode="ask" initialClassId="class-1" />);

    expect(await screen.findByText(/JA is taking a break/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AI offline/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/view-only/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Replay$/i }));
    expect(screen.getByText('Assessment Replay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Ask$/i }));
    expect(screen.getByRole('button', { name: /New chat/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ask JA about this lesson/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Equivalent Fractions/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Ask JA about this lesson/i }));
    expect(mockedJaService.createAskThread).not.toHaveBeenCalled();
    expect(mockedJaService.sendAskMessage).not.toHaveBeenCalled();
  });

  it('blocks JA practice and replay generation calls when AI is degraded', async () => {
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

    render(<StudentJaWorkspace initialMode="practice" initialClassId="class-1" />);

    expect(await screen.findByText(/JA is taking a break/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Practice Run/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Generate Practice Run/i }));
    expect(mockedJaService.createSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: /Replay Revisit weak spots/i }));
    const replayButton = await screen.findByRole('button', {
      name: /Fractions Quiz.*Submitted.*62%/i,
    });
    expect(replayButton).toBeDisabled();
    fireEvent.click(replayButton);
    expect(mockedJaService.createReviewSession).not.toHaveBeenCalled();
  });
});
