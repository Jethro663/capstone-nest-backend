import { aiService } from '@/services/ai-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
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
          status: 'cancelled',
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
      status: 'cancelled',
      progressPercent: 42.5,
      errorMessage: 'connect ECONNREFUSED',
    });
  });

  it('lists class quiz jobs with stable summary fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            jobId: 'job-10',
            jobType: 'quiz_generation',
            classId: 'class-1',
            title: 'Fractions checkpoint',
            status: 'approved',
            progressPercent: 100,
            outputId: 'output-10',
            assessmentId: 'assessment-10',
            createdAt: '2026-08-27T01:00:00.000Z',
            updatedAt: '2026-08-27T02:00:00.000Z',
          },
          {
            jobId: 11,
            status: 'unexpected',
            progressPercent: '58.5',
          },
        ],
      },
    });

    const result = await aiService.listTeacherJobs({
      classId: 'class-1',
      limit: 6,
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/teacher/jobs', {
      params: {
        classId: 'class-1',
        jobType: 'quiz_generation',
        limit: 6,
      },
    });
    expect(result.data[0]).toMatchObject({
      jobId: 'job-10',
      title: 'Fractions checkpoint',
      status: 'approved',
      assessmentId: 'assessment-10',
    });
    expect(result.data[1]).toMatchObject({
      jobId: 'unknown-job',
      title: 'AI Draft Quiz',
      status: 'processing',
      progressPercent: 58.5,
      classId: null,
    });
  });

  it('fetches class index readiness', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          classId: 'class-1',
          chunksIndexed: 0,
          lessonChunks: 0,
          extractionChunks: 0,
          questionChunks: 0,
          isStale: true,
          needsReindex: true,
          readyLessons: [],
          lessonBlockers: [],
          readyExtractions: [],
          extractionBlockers: [],
          sourceSummary: {
            lessons: { total: 1, ready: 0, blocked: 1 },
            extractions: { total: 0, ready: 0, blocked: 0 },
            questions: {
              assessments: 0,
              assessmentsWithQuestions: 0,
              questionCount: 0,
              needsIndex: 0,
            },
          },
        },
      },
    });

    const result = await aiService.getClassIndexStatus('class-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/index/classes/class-1/status');
    expect(result.data.needsReindex).toBe(true);
    expect(result.data.sourceSummary.lessons.blocked).toBe(1);
  });

  it('normalizes cancelled delete-job responses', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'job-delete',
          jobType: 'quiz_generation',
          status: 'cancelled',
          progressPercent: 100,
          statusMessage: 'Draft removed',
        },
      },
    });

    const result = await aiService.deleteTeacherJob('job-delete');

    expect(mockedApi.delete).toHaveBeenCalledWith('/ai/teacher/jobs/job-delete');
    expect(result.data).toMatchObject({
      jobId: 'job-delete',
      status: 'cancelled',
      progressPercent: 100,
    });
  });

  it('queues lesson plan generation jobs through the teacher job seam', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'job-lesson-1',
          jobType: 'class_lesson_plan_generation',
          status: 'pending',
          progressPercent: 5,
          statusMessage: 'Queued',
        },
      },
    });

    const result = await aiService.createLessonPlanJob({
      classId: 'class-1',
      anchorType: 'lesson',
      anchorId: 'lesson-1',
      teacherNote: 'Focus on weak decimal operations.',
      header: {
        instructionalFormat: 'Detailed Lesson Plan',
      },
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/ai/teacher/lesson-plans/jobs',
      expect.objectContaining({
        classId: 'class-1',
        anchorType: 'lesson',
        anchorId: 'lesson-1',
      }),
    );
    expect(result.data).toMatchObject({
      jobId: 'job-lesson-1',
      jobType: 'class_lesson_plan_generation',
      status: 'pending',
    });
  });

  it('normalizes class lesson plan result payloads', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          job: {
            jobId: 'job-lesson-2',
            jobType: 'class_lesson_plan_generation',
            status: 'completed',
            outputId: 'output-lesson-2',
          },
          result: {
            outputId: 'output-lesson-2',
            outputType: 'class_lesson_plan',
            structuredOutput: {
              classProfile: 'mixed',
              header: {
                lessonTitle: 'Fractions and Decimals',
              },
              procedures: {
                review: ['Recall the previous fraction drill.'],
                application: ['Solve paired board work.'],
              },
            },
          },
        },
      },
    });

    const result = await aiService.getLessonPlanJobResult('job-lesson-2');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/teacher/jobs/job-lesson-2/result');
    expect(result.data.job.jobType).toBe('class_lesson_plan_generation');
    expect(result.data.result.outputType).toBe('class_lesson_plan');
    expect(result.data.result.structuredOutput.header.lessonTitle).toBe(
      'Fractions and Decimals',
    );
  });

  it('saves edited lesson plan drafts', async () => {
    mockedApi.patch.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'job-lesson-3',
          jobType: 'class_lesson_plan_generation',
          status: 'completed',
          progressPercent: 100,
          statusMessage: 'Draft saved',
          outputId: 'output-lesson-3',
        },
      },
    });

    const result = await aiService.updateLessonPlanDraft('job-lesson-3', {
      structuredOutput: {
        classProfile: 'struggling',
        header: {
          lessonTitle: 'Whole Numbers',
        },
      },
    });

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/ai/teacher/lesson-plans/jobs/job-lesson-3/draft',
      {
        structuredOutput: {
          classProfile: 'struggling',
          header: {
            lessonTitle: 'Whole Numbers',
          },
        },
      },
    );
    expect(result.data.statusMessage).toBe('Draft saved');
  });

  it('saves edited quiz drafts', async () => {
    mockedApi.patch.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'job-quiz-3',
          jobType: 'quiz_generation',
          status: 'completed',
          progressPercent: 100,
          statusMessage: 'Draft saved',
          outputId: 'output-quiz-3',
        },
      },
    });

    const result = await aiService.updateQuizDraft('job-quiz-3', {
      structuredOutput: {
        title: 'Updated draft',
        questions: [
          {
            type: 'multiple_choice',
            content: '<p>Updated</p>',
            options: [{ text: 'A', isCorrect: true }],
          },
        ],
      },
    });

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/ai/teacher/quizzes/jobs/job-quiz-3/draft',
      {
        structuredOutput: {
          title: 'Updated draft',
          questions: [
            {
              type: 'multiple_choice',
              content: '<p>Updated</p>',
              options: [{ text: 'A', isCorrect: true }],
            },
          ],
        },
      },
    );
    expect(result.data.statusMessage).toBe('Draft saved');
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

  it('calls quiz draft apply preview, apply, retry, and cancel endpoints', async () => {
    mockedApi.post
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            canApply: false,
            blockedReasons: ['Resolve blocking review issues before applying.'],
            assessment: { title: 'Draft quiz', questionCount: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            alreadyApplied: true,
            applyResult: { assessmentId: 'assessment-1' },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            jobId: 'retry-job-1',
            jobType: 'quiz_generation',
            status: 'pending',
            progressPercent: 5,
            retryOfJobId: 'job-1',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            jobId: 'job-1',
            jobType: 'quiz_generation',
            status: 'cancelled',
            progressPercent: 100,
          },
        },
      });

    const preview = await aiService.previewQuizDraftApply('job-1');
    const apply = await aiService.applyQuizDraft('job-1');
    const retry = await aiService.retryQuizDraftJob('job-1');
    const cancel = await aiService.cancelQuizDraftJob('job-1');

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/ai/teacher/quizzes/jobs/job-1/apply/preview',
      {},
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/ai/teacher/quizzes/jobs/job-1/apply',
      {},
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      3,
      '/ai/teacher/quizzes/jobs/job-1/retry',
      {},
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      4,
      '/ai/teacher/quizzes/jobs/job-1/cancel',
      {},
    );
    expect(preview.data.canApply).toBe(false);
    expect(apply.data.alreadyApplied).toBe(true);
    expect(retry.data.jobId).toBe('retry-job-1');
    expect(cancel.data.status).toBe('cancelled');
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
