type JaReplayResponse = {
  isCorrect: boolean;
};

type JaReplayItem = {
  responses: JaReplayResponse[];
};

type JaReplaySession = {
  id: string;
  status: string;
  sourceSnapshotJson: unknown;
  items?: JaReplayItem[];
};

export type JaReviewAttemptStats = {
  count: number;
  activeReviewSessionId: string | null;
  completedReviewSessionId: string | null;
  replayScore: number | null;
};

export function calculateJaReplayScore(items: JaReplayItem[]): number | null {
  if (items.length === 0) return null;

  const correctCount = items.filter((item) =>
    item.responses.some((response) => response.isCorrect),
  ).length;
  return Math.round((correctCount / items.length) * 100);
}

export function buildJaReviewAttemptStats(
  sessions: JaReplaySession[],
): Map<string, JaReviewAttemptStats> {
  const statsByAttempt = new Map<string, JaReviewAttemptStats>();

  for (const session of sessions) {
    const snapshot = (session.sourceSnapshotJson ?? {}) as Record<
      string,
      unknown
    >;
    const attemptId =
      typeof snapshot.attemptId === 'string' ? snapshot.attemptId : null;
    const assessmentId =
      typeof snapshot.assessmentId === 'string' ? snapshot.assessmentId : null;
    if (!attemptId && !assessmentId) continue;

    const stats = (attemptId ? statsByAttempt.get(attemptId) : undefined) ??
      (assessmentId ? statsByAttempt.get(assessmentId) : undefined) ?? {
        count: 0,
        activeReviewSessionId: null,
        completedReviewSessionId: null,
        replayScore: null,
      };
    stats.count += 1;

    if (session.status === 'active' && !stats.activeReviewSessionId) {
      stats.activeReviewSessionId = session.id;
    }
    if (session.status === 'completed' && !stats.completedReviewSessionId) {
      stats.completedReviewSessionId = session.id;
      stats.replayScore = calculateJaReplayScore(session.items ?? []);
    }

    if (attemptId) statsByAttempt.set(attemptId, stats);
    if (assessmentId) statsByAttempt.set(assessmentId, stats);
  }

  return statsByAttempt;
}
