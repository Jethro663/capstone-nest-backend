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
jest.mock('../services/performance', () => ({ performanceApi: {} }));
jest.mock('../services/profile', () => ({ profileApi: {} }));

const { queryKeys, useLxpCheckpointMutation, useLxpPlaylist, useTutorSession } = require('../hooks');

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
