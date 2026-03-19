import { aiService } from '@/services/ai-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes queued quiz draft jobs from envelope responses', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'pending',
          progressPercent: 5,
          statusMessage: 'Queued',
        },
      },
    });

    const result = await aiService.createQuizDraftJob({
      classId: 'class-1',
      questionCount: 5,
      questionType: 'multiple_choice',
      assessmentType: 'quiz',
      passingScore: 60,
      feedbackLevel: 'standard',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/ai/teacher/quizzes/jobs', expect.any(Object));
    expect(result.data.jobId).toBe('job-1');
    expect(result.data.status).toBe('pending');
  });

  it('normalizes quiz job result payloads', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          job: {
            jobId: 'job-1',
            jobType: 'quiz_generation',
            status: 'completed',
            outputId: 'output-1',
            assessmentId: 'assessment-1',
          },
          result: {
            outputId: 'output-1',
            outputType: 'assessment_draft',
            structuredOutput: {
              title: 'Draft quiz',
              questions: [],
              assessmentId: 'assessment-1',
            },
          },
        },
      },
    });

    const result = await aiService.getQuizDraftJobResult('job-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/teacher/jobs/job-1/result');
    expect(result.data.job.assessmentId).toBe('assessment-1');
    expect(result.data.result.structuredOutput.title).toBe('Draft quiz');
  });
});
