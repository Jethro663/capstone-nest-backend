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

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
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
                { id: 'option-right', text: 'x=2 or x=3', isCorrect: true, order: 1 },
                { id: 'option-wrong', text: 'x=1 or x=6', isCorrect: false, order: 2 },
              ],
            },
          },
        ],
      },
    } as any);

    mockedAiService.explainMistake.mockResolvedValue({
      data: {
        reply: 'You mixed up factors.',
        modelUsed: 'seed-model',
        citations: [{ chunkId: 'chunk-1', sourceType: 'lesson', label: 'Quadratic lesson' }],
        suggestedNext: { label: 'Review factoring patterns.' },
        analysisPacket: {
          mistakeSummary: 'Wrong factor pair selected.',
          likelyMisconceptions: ['Signs were swapped.'],
          requiredEvidence: ['Check product and sum.'],
          answerGuardrail: 'Avoid guessing roots.',
        },
      },
    } as any);

    mockedLxpService.submitEvaluation.mockResolvedValue({ data: { id: 'eval-1' } } as any);
  });

  it('opens rating modal after Ask Ja and submits ai mentor evaluation metadata', async () => {
    render(<StudentAssessmentResultsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ask ja/i })).toBeInTheDocument();
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
});
