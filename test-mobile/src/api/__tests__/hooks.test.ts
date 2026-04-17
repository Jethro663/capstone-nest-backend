import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('../services/ai', () => ({ aiApi: {} }));
jest.mock('../services/announcements', () => ({ announcementsApi: {} }));
jest.mock('../services/assessments', () => ({ assessmentsApi: {} }));
jest.mock('../services/classes', () => ({ classesApi: {} }));
jest.mock('../services/lessons', () => ({ lessonsApi: {} }));
jest.mock('../services/lxp', () => ({ lxpApi: { completeCheckpoint: jest.fn() } }));
jest.mock('../services/ja', () => ({ jaApi: {} }));
jest.mock('../services/modules', () => ({ modulesApi: {} }));
jest.mock('../services/performance', () => ({ performanceApi: {} }));
jest.mock('../services/profile', () => ({
  profileApi: {
    getMine: jest.fn(),
  },
}));
jest.mock('../services/reports', () => ({
  reportsApi: {
    getTranscript: jest.fn(),
    getAssessmentHistory: jest.fn(),
  },
}));
jest.mock('../services/school-events', () => ({ schoolEventsApi: {} }));
jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: 'localhost:3000',
  },
}));

const {
  queryKeys,
  useAssessmentHistory,
  useLessonDetail,
  useLxpCheckpointMutation,
  useLxpPlaylist,
  useModuleDetail,
  useSchoolEvents,
  useTranscript,
  useTutorSession,
} = require('../hooks');

describe('api hooks', () => {
  const mockedUseQuery = useQuery as jest.Mock;
  const mockedUseMutation = useMutation as jest.Mock;
  const mockedUseQueryClient = useQueryClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({ data: null, isLoading: false });
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('disables playlist query when classId is missing', () => {
    useLxpPlaylist(undefined);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['lxp-playlist', 'missing'],
        enabled: false,
      }),
    );
  });

  it('disables tutor session query when sessionId is missing', () => {
    useTutorSession(undefined);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tutor-session', 'missing'],
        enabled: false,
      }),
    );
  });

  it('queries school events with the provided filters', () => {
    const query = { schoolYear: '2025-2026' };

    useSchoolEvents(query);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.schoolEvents(query),
      }),
    );
  });

  it('queries transcript data with the provided filters', () => {
    const query = { page: 2, limit: 10 };

    useTranscript(query);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.transcript(query),
      }),
    );
  });

  it('queries assessment history data with the provided filters', () => {
    const query = { submission: 'submitted' as const };

    useAssessmentHistory(query);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.assessmentHistory(query),
      }),
    );
  });

  it('queries lesson detail by lesson id', () => {
    useLessonDetail('lesson-1');

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.lessonDetail('lesson-1'),
        enabled: true,
      }),
    );
  });

  it('queries module detail by class and module ids', () => {
    useModuleDetail('class-1', 'module-1');

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.moduleDetail('class-1', 'module-1'),
        enabled: true,
      }),
    );
  });

  it('invalidates playlist and eligibility keys after checkpoint completion when classId exists', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ invalidateQueries });

    let mutationConfig: { onSuccess?: () => Promise<void> } | undefined;
    mockedUseMutation.mockImplementation((config) => {
      mutationConfig = config;
      return { mutateAsync: jest.fn(), isPending: false };
    });

    useLxpCheckpointMutation('class-1');
    await mutationConfig?.onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.lxpPlaylist('class-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.lxpEligibility,
    });
  });

  it('still invalidates eligibility after checkpoint completion when classId is missing', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ invalidateQueries });

    let mutationConfig: { onSuccess?: () => Promise<void> } | undefined;
    mockedUseMutation.mockImplementation((config) => {
      mutationConfig = config;
      return { mutateAsync: jest.fn(), isPending: false };
    });

    useLxpCheckpointMutation(undefined);
    await mutationConfig?.onSuccess?.();

    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.lxpPlaylist('class-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.lxpEligibility,
    });
  });
});
