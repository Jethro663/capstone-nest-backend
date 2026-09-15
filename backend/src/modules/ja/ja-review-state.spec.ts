import { buildJaReviewAttemptStats } from './ja-review-state';

describe('buildJaReviewAttemptStats', () => {
  it('projects a completed replay score from persisted response correctness', () => {
    const stats = buildJaReviewAttemptStats([
      {
        id: 'completed-1',
        status: 'completed',
        sourceSnapshotJson: {
          attemptId: 'attempt-1',
          assessmentId: 'assessment-1',
        },
        items: [
          { responses: [{ isCorrect: true }] },
          { responses: [{ isCorrect: true }] },
          { responses: [{ isCorrect: true }] },
          { responses: [{ isCorrect: true }] },
          { responses: [{ isCorrect: false }] },
        ],
      },
    ]);

    expect(stats.get('attempt-1')).toEqual({
      count: 1,
      activeReviewSessionId: null,
      completedReviewSessionId: 'completed-1',
      replayScore: 80,
    });
    expect(stats.get('assessment-1')).toBe(stats.get('attempt-1'));
  });

  it('does not let a newer active replay erase completed history', () => {
    const stats = buildJaReviewAttemptStats([
      {
        id: 'active-2',
        status: 'active',
        sourceSnapshotJson: {
          attemptId: 'attempt-2',
          assessmentId: 'assessment-1',
        },
        items: [],
      },
      {
        id: 'completed-1',
        status: 'completed',
        sourceSnapshotJson: {
          attemptId: 'attempt-1',
          assessmentId: 'assessment-1',
        },
        items: [
          { responses: [{ isCorrect: true }] },
          { responses: [{ isCorrect: false }] },
        ],
      },
    ]);

    expect(stats.get('attempt-1')).toEqual({
      count: 2,
      activeReviewSessionId: 'active-2',
      completedReviewSessionId: 'completed-1',
      replayScore: 50,
    });
    expect(stats.get('attempt-2')).toBe(stats.get('attempt-1'));
  });
});
