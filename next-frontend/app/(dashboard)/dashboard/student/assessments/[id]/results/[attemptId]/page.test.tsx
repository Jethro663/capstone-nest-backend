'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentAssessmentResultsPage from './page';
import { assessmentService } from '@/services/assessment-service';
import { aiService } from '@/services/ai-service';
import { lxpService } from '@/services/lxp-service';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1', attemptId: 'attempt-1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getAttemptResults: jest.fn(),
  },
}));

jest.mock('@/services/ai-service', () => ({
  aiService: {
    explainMistake: jest.fn(),
  },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    submitEvaluation: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedAiService = aiService as jest.Mocked<typeof aiService>;
const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe('StudentAssessmentResultsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAssessmentService.getAttemptResults.mockResolvedValue({
      data: {
        score: 40,
        passed: false,
        isReturned: true,
        attemptNumber: 1,
        responses: [
          {
            questionId: 'question-1',
            isCorrect: false,
            pointsEarned: 0,
            selectedOptionId: 'option-wrong',
            question: {
              id: 'question-1',
              assessmentId: 'assessment-1',
              type: 'multiple_choice',
              content: 'Solve x^2 - 5x + 6 = 0',
              points: 1,
              order: 1,
              options: [
                {
                  id: 'option-right',
                  text: 'x=2 or x=3',
                  isCorrect: true,
                  order: 1,
                },
                {
                  id: 'option-wrong',
                  text: 'x=1 or x=6',
                  isCorrect: false,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

    mockedAiService.explainMistake.mockResolvedValue({
      data: {
        reply: 'You mixed up factors.',
        modelUsed: 'seed-model',
        citations: [
          {
            chunkId: 'chunk-1',
            sourceType: 'lesson',
            label: 'Quadratic lesson',
          },
        ],
        suggestedNext: { label: 'Review factoring patterns.' },
        analysisPacket: {
          mistakeSummary: 'Wrong factor pair selected.',
          likelyMisconceptions: ['Signs were swapped.'],
          requiredEvidence: ['Check product and sum.'],
          answerGuardrail: 'Avoid guessing roots.',
        },
      },
    } as Awaited<ReturnType<typeof aiService.explainMistake>>);

    mockedLxpService.submitEvaluation.mockResolvedValue({
      data: { id: 'eval-1' },
    } as Awaited<ReturnType<typeof lxpService.submitEvaluation>>);
  });

  it('opens rating modal after Ask Ja and submits ai mentor evaluation metadata', async () => {
    render(<StudentAssessmentResultsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Review' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    await waitFor(() => {
      expect(screen.getByText('Question Review')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /question 1/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /ask ja/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /ask ja/i }));

    await waitFor(() => {
      expect(screen.getByText(/rate ja's help/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rate 4 stars/i }));
    fireEvent.change(
      screen.getByPlaceholderText(/optional: what made this explanation/i),
      { target: { value: 'Great hint sequencing.' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockedLxpService.submitEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          targetModule: 'ai_mentor',
          usabilityScore: 4,
          aiContextMetadata: expect.objectContaining({
            sessionType: 'mistake_explanation',
            attemptId: 'attempt-1',
            questionId: 'question-1',
            sourceFlow: 'assessment_results',
          }),
        }),
      );
    });
  });

  it('shows result release messaging and hides question review when only the score is available', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      data: {
        score: 88,
        passed: true,
        isReturned: true,
        attemptNumber: 2,
        feedbackStatus: {
          level: 'immediate',
          unlocked: true,
          message:
            'You can see your score. Detailed feedback not available for immediate assessments.',
        },
        responses: [
          {
            questionId: 'question-1',
            isCorrect: null,
            pointsEarned: null,
            question: {
              id: 'question-1',
              assessmentId: 'assessment-1',
              type: 'multiple_choice',
              content: 'Sample prompt',
              points: 1,
              order: 1,
              options: [],
            },
          },
        ],
      },
    } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

    render(<StudentAssessmentResultsPage />);

    expect(await screen.findByText('Result Release')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Detailed feedback not available for immediate assessments/i,
      ),
    ).toHaveLength(2);
    expect(screen.getByText('Score only')).toBeInTheDocument();
    expect(screen.queryByText('Question Review')).not.toBeInTheDocument();
  });

  it('renders the new results and next step structure for score-only results', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      data: {
        score: 88,
        passed: true,
        isReturned: true,
        attemptNumber: 2,
        returnedAt: '2026-05-03T01:00:00.000Z',
        feedbackStatus: {
          level: 'immediate',
          unlocked: true,
          message:
            'You can see your score. Detailed feedback not available for immediate assessments.',
        },
        assessment: {
          id: 'assessment-1',
          title: 'Practice Quiz',
          type: 'quiz',
          totalPoints: 10,
        },
        responses: [],
      },
    } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

    render(<StudentAssessmentResultsPage />);

    expect(await screen.findByText('What You Can See Now')).toBeInTheDocument();
    expect(screen.getByText('Practice Quiz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next Step' }));
    expect(
      screen.getByRole('button', { name: /Go to Class Assignments/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Go to Class Assignments/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('.student-page')).not.toBeInTheDocument();
    expect(screen.queryByText('Question Review')).not.toBeInTheDocument();
  });

  it('explains capped full credit without displaying an overflowing percentage', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      data: {
        score: 331,
        scorePercent: 100,
        scoreBreakdown: {
          basePoints: 5,
          bonusPoints: 15,
          awardedPoints: 20,
          possiblePoints: 10,
          effectivePoints: 10,
          scorePercent: 100,
          wasCapped: true,
          bonusReason: 'Teacher correction after review',
        },
        passed: true,
        isReturned: true,
        attemptNumber: 1,
        assessment: {
          id: 'assessment-1',
          title: 'Ten-point cap check',
          type: 'quiz',
          totalPoints: 10,
        },
        responses: [],
      },
    } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

    render(<StudentAssessmentResultsPage />);

    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.getByText('10/10 pts')).toBeInTheDocument();
    expect(
      screen.getByText(
        '+15 bonus (capped at full credit) — Teacher correction after review',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('331%')).not.toBeInTheDocument();
    expect(screen.queryByText('200%')).not.toBeInTheDocument();
  });

  it('shows rubric and submitted file sections for file upload results', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'Fixture response',
      data: {
        score: 92,
        passed: true,
        isReturned: true,
        attemptNumber: 1,
        teacherFeedback: 'Strong work overall.',
        assessment: {
          id: 'assessment-1',
          title: 'Upload Task',
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [
            { id: 'criterion-1', title: 'Accuracy', points: 50 },
          ],
        },
        rubricScores: [{ criterionId: 'criterion-1', pointsEarned: 46 }],
        submittedFiles: [
          {
            id: 'file-1',
            originalName: 'submission.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            uploadedAt: '2026-05-03T01:00:00.000Z',
          },
        ],
        responses: [],
      },
    } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

    render(<StudentAssessmentResultsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Rubric Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Your Submission')).toBeInTheDocument();
    expect(screen.getByText('submission.pdf')).toBeInTheDocument();
  });
});
