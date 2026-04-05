import { lxpService } from '@/services/lxp-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('lxpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests evaluation list with targetModule filter when provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 1, rows: [{ id: 'eval-1', targetModule: 'lxp' }] },
      },
    });

    const result = await lxpService.getEvaluations('lxp');

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/evaluations', {
      params: { targetModule: 'lxp' },
    });
    expect(result.data.count).toBe(1);
  });

  it('preserves backend evaluation summary payload when provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          count: 2,
          rows: [],
          summary: {
            averages: {
              usabilityScore: 4.5,
              functionalityScore: 4.0,
              performanceScore: 4.0,
              satisfactionScore: 4.5,
            },
            feedbackCount: 1,
            moduleBreakdown: [
              {
                targetModule: 'lxp',
                count: 2,
                averages: {
                  usabilityScore: 4.5,
                  functionalityScore: 4.0,
                  performanceScore: 4.0,
                  satisfactionScore: 4.5,
                },
              },
            ],
          },
        },
      },
    });

    const result = await lxpService.getEvaluations();

    expect(result.data.summary?.feedbackCount).toBe(1);
    expect(result.data.summary?.moduleBreakdown[0].targetModule).toBe('lxp');
  });

  it('requests evaluation list without params when no filter is provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 0, rows: [] },
      },
    });

    await lxpService.getEvaluations();

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/evaluations', {
      params: undefined,
    });
  });

  it('normalizes non-envelope evaluation submit responses', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        id: 'eval-2',
        targetModule: 'overall',
      },
    });

    const result = await lxpService.submitEvaluation({
      targetModule: 'overall',
      usabilityScore: 5,
      functionalityScore: 4,
      performanceScore: 4,
      satisfactionScore: 5,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/lxp/evaluations', {
      targetModule: 'overall',
      usabilityScore: 5,
      functionalityScore: 4,
      performanceScore: 4,
      satisfactionScore: 5,
    });
    expect(result).toEqual({
      data: {
        id: 'eval-2',
        targetModule: 'overall',
      },
    });
  });

  it('submits intervention assignment payload to teacher endpoint', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: { classId: 'class-1', threshold: 74, count: 0, queue: [] },
      },
    });

    await lxpService.assignIntervention('case-1', {
      lessonAssignments: [{ lessonId: 'lesson-1', xpAwarded: 20 }],
      assessmentAssignments: [{ assessmentId: 'assessment-1', xpAwarded: 30 }],
      note: 'AI adjusted plan',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/lxp/teacher/interventions/case-1/assign',
      {
        lessonAssignments: [{ lessonId: 'lesson-1', xpAwarded: 20 }],
        assessmentAssignments: [
          { assessmentId: 'assessment-1', xpAwarded: 30 },
        ],
        note: 'AI adjusted plan',
      },
    );
  });
});
