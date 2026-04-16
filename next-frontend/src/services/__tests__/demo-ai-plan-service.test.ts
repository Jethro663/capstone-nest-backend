import { generateDemoAiPlan } from '@/services/demo-ai-plan-service';
import axios from 'axios';

jest.mock('axios', () => ({
  post: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('generateDemoAiPlan', () => {
  const baseInput = {
    subjectId: 'science',
    quarterExamScore: 70,
    weakConcepts: ['Cells', 'Scientific method'],
  } as const;

  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  it('returns live result when live generator succeeds', async () => {
    const result = await generateDemoAiPlan(baseInput, {
      requestLivePlan: jest.fn().mockResolvedValue({
        source: 'live',
        weakConcepts: ['Cells'],
        recommendedModules: ['Science Module 2'],
        teacherSummary: 'Use guided remediation before re-check.',
        lxpQuestions: [
          {
            id: 'live-1',
            prompt: 'Which part controls cell activities?',
            options: ['Nucleus', 'Ribosome', 'Cell wall', 'Vacuole'],
            correctIndex: 0,
            explanation: 'The nucleus is the control center of the cell.',
          },
        ],
      }),
    });

    expect(result.source).toBe('live');
    expect(result.lxpQuestions).toHaveLength(1);
  });

  it('uses public demo endpoint by default and normalizes live payload', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          source: 'live',
          weakConcepts: ['Cells'],
          recommendedModules: ['Science Module 2'],
          teacherSummary: 'Public AI path generated successfully.',
          lxpQuestions: [
            {
              id: 'q1',
              prompt: 'Which organelle controls cell activities?',
              options: ['Nucleus', 'Ribosome', 'Golgi body', 'Lysosome'],
              correctIndex: 0,
              explanation: 'The nucleus directs many core cell functions.',
            },
          ],
        },
      },
    });

    const result = await generateDemoAiPlan(baseInput);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/ai/demo/intervention-plan',
      expect.objectContaining({
        subjectId: 'science',
        quarterExamScore: 70,
      }),
      expect.objectContaining({
        withCredentials: false,
      }),
    );
    expect(result.source).toBe('live');
    expect(result.lxpQuestions).toHaveLength(1);
  });

  it('falls back to deterministic local plan when live generator fails', async () => {
    const result = await generateDemoAiPlan(baseInput, {
      requestLivePlan: jest.fn().mockRejectedValue(new Error('Unauthorized')),
    });

    expect(result.source).toBe('fallback');
    expect(result.weakConcepts).toEqual(baseInput.weakConcepts);
    expect(result.lxpQuestions.length).toBeGreaterThanOrEqual(8);
  });
});
