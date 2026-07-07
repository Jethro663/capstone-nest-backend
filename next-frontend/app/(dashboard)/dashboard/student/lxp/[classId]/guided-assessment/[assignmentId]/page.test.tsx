'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import StudentGuidedAssessmentPage from './page';
import { lxpService } from '@/services/lxp-service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ classId: 'class-1', assignmentId: 'assignment-1' }),
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    startGuidedAssessment: jest.fn(),
    updateGuidedAssessmentProgress: jest.fn(),
    submitGuidedAssessment: jest.fn(),
    getGuidedAssessmentResult: jest.fn(),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

const guidedAssessment = {
  id: 'guided-assessment-1',
  title: 'Simplified guided assessment: Module 2 Quiz',
  description: 'Guided check',
  weakConcepts: ['Elements'],
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice' as const,
      stem: 'Elements are represented by symbols.',
      hint: 'Look for the option that names how elements are written in science.',
      explanation: 'Element symbols use one capital letter and sometimes one lowercase letter.',
      weakConceptTag: 'Element symbols',
      options: [
        { id: 'a', text: 'Element symbols', isCorrect: true },
        { id: 'b', text: 'Mixtures', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      type: 'multiple_choice' as const,
      stem: 'Pure substances are made of one kind of atom.',
      hint: 'Think about the term for one kind of atom.',
      reviewHint: 'Review Module 2 and focus on the example about one kind of atom.',
      explanation: 'Elements are pure substances made of one type of atom.',
      weakConceptTag: 'Elements',
      options: [
        { id: 'c', text: 'Elements', isCorrect: true },
        { id: 'd', text: 'Compounds', isCorrect: false },
      ],
    },
  ],
};

const attemptSummary = {
  maxAttempts: 3,
  attemptsUsed: 1,
  remainingAttempts: 2,
  canRetry: true,
  isLocked: false,
  passingScore: 60,
  passed: false,
  bestAttemptId: null,
  bestScorePercent: null,
  latestScorePercent: null,
  attempts: [],
};

function mockInProgressSession() {
  mockedLxpService.startGuidedAssessment.mockResolvedValue({
    data: {
      assignmentId: 'assignment-1',
      checkpointLabel: 'AI guided assessment',
      guidedAssessment,
      attempt: {
        id: 'attempt-1',
        status: 'in_progress',
        attemptNumber: 1,
        currentQuestionIndex: 0,
        responses: [],
        hintedQuestionIds: [],
        scorePercent: null,
      },
      attemptSummary,
    },
  } as Awaited<ReturnType<typeof lxpService.startGuidedAssessment>>);
  mockedLxpService.updateGuidedAssessmentProgress.mockResolvedValue({
    data: {
      attempt: {
        id: 'attempt-1',
        status: 'in_progress',
        currentQuestionIndex: 0,
        responses: [],
        hintedQuestionIds: [],
        scorePercent: null,
      },
    },
  } as Awaited<ReturnType<typeof lxpService.updateGuidedAssessmentProgress>>);
}

function mockSubmittedSession() {
  mockedLxpService.startGuidedAssessment.mockResolvedValue({
    data: {
      assignmentId: 'assignment-1',
      checkpointLabel: 'AI guided assessment',
      guidedAssessment,
      attempt: {
        id: 'attempt-1',
        status: 'submitted',
        attemptNumber: 1,
        currentQuestionIndex: 0,
        responses: [
          { questionId: 'q1', answer: 'a', isCorrect: true },
          { questionId: 'q2', answer: 'd', isCorrect: false },
        ],
        hintedQuestionIds: ['q2'],
        scorePercent: 50,
        submittedAt: '2026-05-05T00:00:00.000Z',
      },
      attemptSummary: {
        ...attemptSummary,
        attemptsUsed: 1,
        remainingAttempts: 2,
        latestScorePercent: 50,
        attempts: [
          {
            id: 'attempt-1',
            attemptNumber: 1,
            status: 'submitted',
            scorePercent: 50,
            correctCount: 1,
            totalQuestions: 2,
            submittedAt: '2026-05-05T00:00:00.000Z',
          },
        ],
      },
    },
  } as Awaited<ReturnType<typeof lxpService.startGuidedAssessment>>);
  mockedLxpService.getGuidedAssessmentResult.mockResolvedValue({
    data: {
      assignmentId: 'assignment-1',
      attemptId: 'attempt-1',
      guidedAssessment,
      scorePercent: 50,
      correctCount: 1,
      responses: [
        { questionId: 'q1', answer: 'a', isCorrect: true, weakConceptTag: 'Element symbols' },
        { questionId: 'q2', answer: 'd', isCorrect: false, weakConceptTag: 'Elements' },
      ],
      hintedQuestionIds: ['q2'],
      formativeSummary: {
        improvedConcepts: ['Element symbols'],
        stillWeakConcepts: ['Elements'],
      },
      submittedAt: '2026-05-05T00:00:00.000Z',
    },
  } as Awaited<ReturnType<typeof lxpService.getGuidedAssessmentResult>>);
}

describe('StudentGuidedAssessmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the normal assessment taker theme and keeps progress status stable while hints are optional', async () => {
    mockInProgressSession();
    const { container } = render(<StudentGuidedAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Simplified guided assessment: Module 2 Quiz')).toBeInTheDocument();
    });

    expect(container.querySelector('.student-assessment-take-theme')).toBeInTheDocument();
    expect(screen.getByText('0/2 answered')).toBeInTheDocument();
    expect(screen.queryByText(/lxp-only guided attempt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/saving progress/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByTestId('guided-hint-panel')).toHaveTextContent(
      'Look for the option that names how elements are written in science.',
    );
  });

  it('groups submitted guided assessment results into correct and review sections', async () => {
    mockSubmittedSession();
    render(<StudentGuidedAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Simplified guided assessment: Module 2 Quiz' })).toBeInTheDocument();
    });

    const correctSection = screen.getByRole('region', { name: /correct answers/i });
    const reviewSection = screen.getByRole('region', { name: /review these answers/i });

    expect(within(correctSection).getByText(/Elements are represented by symbols/i)).toBeInTheDocument();
    expect(within(reviewSection).getByText(/Pure substances are made of one kind of atom/i)).toBeInTheDocument();
    expect(within(reviewSection).getByText(/Your previous answer: Compounds/i)).toBeInTheDocument();
    expect(within(reviewSection).getByText(/Correct answer: Elements/i)).toBeInTheDocument();
    expect(within(reviewSection).getByText(/Review Module 2 and focus on the example/i)).toBeInTheDocument();
  });
});
