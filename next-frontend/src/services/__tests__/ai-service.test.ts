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

  it('normalizes degraded teacher job-status payloads into stable polling fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        degraded: true,
        data: {
          jobId: 'job-9',
          status: 'invalid-status',
          progressPercent: '42.5',
          errorMessage: 'connect ECONNREFUSED',
        },
      },
    });

    const result = await aiService.getTeacherJobStatus('job-9');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/teacher/jobs/job-9');
    expect(result.data).toMatchObject({
      jobId: 'job-9',
      jobType: 'unknown',
      status: 'processing',
      progressPercent: 42.5,
      errorMessage: 'connect ECONNREFUSED',
    });
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

  it('coerces degraded quiz-result payloads into a safe result envelope', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        degraded: true,
        message: 'AI job result temporarily unavailable; keep polling job status.',
        data: {
          jobId: 'job-2',
          status: 'processing',
          errorMessage: 'connect ECONNREFUSED',
        },
      },
    });

    const result = await aiService.getQuizDraftJobResult('job-2');

    expect(result.data.job).toMatchObject({
      jobId: 'job-2',
      status: 'processing',
      jobType: 'unknown',
    });
    expect(result.data.result.outputType).toBe('degraded_unavailable');
    expect(result.data.result.structuredOutput.questions).toEqual([]);
  });

  it('coerces degraded intervention-result payloads into a safe result envelope', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        degraded: true,
        data: {
          jobId: 'job-3',
          status: 'processing',
        },
      },
    });

    const result = await aiService.getInterventionJobResult('job-3');

    expect(result.data.job.jobId).toBe('job-3');
    expect(result.data.result.outputType).toBe('degraded_unavailable');
    expect(result.data.result.structuredOutput.aiSummary.teacherActions).toEqual(
      [],
    );
    expect(
      result.data.result.structuredOutput.suggestedAssignmentPayload,
    ).toEqual({
      lessonIds: [],
      assessmentIds: [],
    });
  });

  it('normalizes cached degraded job-result payloads that already include job/result objects', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        degraded: true,
        data: {
          job: {
            jobId: 'job-4',
            jobType: 'remedial_plan_generation',
            status: 'bad-status',
            outputId: 'output-4',
            updatedAt: '2026-04-04T12:00:00.000Z',
          },
          result: {
            outputId: 'output-4',
            outputType: 'intervention_recommendation',
            structuredOutput: {
              caseId: 'case-4',
              weakConcepts: ['Decimals'],
              recommendedLessons: [],
              recommendedAssessments: [],
              aiSummary: {
                summary: 'Cached fallback summary',
                teacherActions: [],
                studentFocus: [],
              },
              suggestedAssignmentPayload: {
                lessonIds: [],
                assessmentIds: [],
              },
            },
          },
        },
      },
    });

    const result = await aiService.getInterventionJobResult('job-4');

    expect(result.data.job).toMatchObject({
      jobId: 'job-4',
      jobType: 'remedial_plan_generation',
      status: 'processing',
      outputId: 'output-4',
      updatedAt: '2026-04-04T12:00:00.000Z',
    });
    expect(result.data.result).toMatchObject({
      outputId: 'output-4',
      outputType: 'intervention_recommendation',
    });
    expect(result.data.result.structuredOutput.caseId).toBe('case-4');
  });

  it('coerces malformed full-shape result payload into safe defaults', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          job: {
            jobId: 123,
            status: 'completed',
          },
          result: {
            outputId: null,
            outputType: 42,
            structuredOutput: null,
          },
        },
      },
    });

    const result = await aiService.getQuizDraftJobResult('job-5');

    expect(result.data.job).toMatchObject({
      jobId: 'unknown-job',
      jobType: 'unknown',
      status: 'completed',
      outputId: '',
    });
    expect(result.data.result.outputType).toBe('degraded_unavailable');
    expect(result.data.result.structuredOutput).toMatchObject({
      title: 'AI draft temporarily unavailable',
      questions: [],
    });
  });
});
