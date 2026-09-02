import { apiClient } from '../client';
import { evaluationsApi } from '../services/evaluations';
import { teacherEvaluationDashboardFixture as dashboard } from './fixtures/contracts';

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('evaluationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the backend-owned student teacher-evaluation dashboard', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: { success: true, data: dashboard },
    } as never);

    await expect(evaluationsApi.getStudentInbox()).resolves.toEqual(dashboard);
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/lxp/me/teacher-evaluations',
    );
  });

  it('submits the exact class, period, type, ratings, and comment payload', async () => {
    const payload = {
      classId: 'class-1',
      gradingPeriod: 'Q2' as const,
      evaluationType: 'teacher_class' as const,
      ratings: { teaching_clarity: 5, teacher_support: 4 },
      comment: 'Clear explanations.',
    };
    const persisted = { id: 'submission-1', ...payload };
    mockedApiClient.post.mockResolvedValue({
      data: { success: true, data: persisted },
    } as never);

    await expect(
      evaluationsApi.submitEvaluation(payload as never),
    ).resolves.toEqual(persisted);
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/lxp/me/teacher-evaluations',
      payload,
    );
  });

  it('propagates rejected submissions without fabricating success', async () => {
    const failure = new Error('network unavailable');
    mockedApiClient.post.mockRejectedValue(failure);

    await expect(
      evaluationsApi.submitEvaluation({
        classId: 'class-1',
        gradingPeriod: 'Q2',
        evaluationType: 'teacher_class',
        ratings: { teaching_clarity: 5 },
      } as never),
    ).rejects.toBe(failure);
  });

  it('loads assigned system evaluations for the authenticated respondent', async () => {
    const systemDashboard = {
      pending: [
        {
          id: 'assignment-1',
          campaignId: 'campaign-1',
          formType: 'system',
          targetModule: 'lms',
          title: 'LMS evaluation',
          description: 'Evaluate the LMS.',
          audienceRole: 'teacher',
          classId: null,
          startsAt: '2026-09-01T00:00:00.000Z',
          endsAt: '2026-09-30T00:00:00.000Z',
          status: 'pending',
          questions: [{ key: 'usability', label: 'Usability' }],
        },
      ],
      completed: [],
    };
    mockedApiClient.get.mockResolvedValue({
      data: { success: true, data: systemDashboard },
    } as never);

    const api = evaluationsApi as typeof evaluationsApi & {
      getMySystemEvaluations: () => Promise<typeof systemDashboard>;
    };
    await expect(api.getMySystemEvaluations()).resolves.toEqual(systemDashboard);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/lxp/me/system-evaluations');
  });

  it('submits an assigned system evaluation through its assignment route', async () => {
    const payload = {
      questionRatings: { usability: 5 },
      feedback: 'Works well.',
    };
    mockedApiClient.post.mockResolvedValue({
      data: { success: true, data: { id: 'assignment-1', status: 'submitted' } },
    } as never);

    const api = evaluationsApi as typeof evaluationsApi & {
      submitAssignedSystemEvaluation: (
        assignmentId: string,
        input: typeof payload,
      ) => Promise<unknown>;
    };
    await api.submitAssignedSystemEvaluation('assignment-1', payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/lxp/me/system-evaluations/assignment-1/submit',
      payload,
    );
  });
});
