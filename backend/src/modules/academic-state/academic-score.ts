export interface BoundedScoreInput {
  basePoints: number;
  bonusPoints?: number | null;
  bonusReason?: string | null;
  possiblePoints: number;
}

export interface AcademicScoreBreakdown {
  basePoints: number;
  bonusPoints: number;
  awardedPoints: number;
  possiblePoints: number;
  effectivePoints: number;
  scorePercent: number;
  wasCapped: boolean;
  bonusReason: string | null;
}

export interface StoredAcademicScoreEvidence {
  score?: number | null;
  basePointsEarned?: number | string | null;
  possiblePointsSnapshot?: number | string | null;
  bonusPoints?: number | string | null;
  bonusReason?: string | null;
}

export interface AcademicScoreContract {
  /** Backward-compatible percentage. */
  score: number | null;
  scorePercent: number | null;
  scoreBreakdown: AcademicScoreBreakdown | null;
}

function assertFinite(label: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }
}

export function calculateBoundedScore(
  input: BoundedScoreInput,
): AcademicScoreBreakdown {
  const bonusPoints = input.bonusPoints ?? 0;
  assertFinite('Base points', input.basePoints);
  assertFinite('Bonus points', bonusPoints);
  assertFinite('Possible points', input.possiblePoints);

  if (input.possiblePoints <= 0) {
    throw new RangeError('Possible points must be greater than 0');
  }
  if (input.basePoints < 0 || input.basePoints > input.possiblePoints) {
    throw new RangeError(
      `Base points must be between 0 and ${input.possiblePoints}`,
    );
  }
  if (bonusPoints < 0) {
    throw new RangeError('Bonus points must be at least 0');
  }

  const bonusReason = input.bonusReason?.trim() || null;
  if (bonusPoints > 0 && !bonusReason) {
    throw new RangeError('Bonus points require a reason');
  }

  const awardedPoints = input.basePoints + bonusPoints;
  const effectivePoints = Math.min(awardedPoints, input.possiblePoints);
  const scorePercent = Number(
    ((effectivePoints / input.possiblePoints) * 100).toFixed(6),
  );

  return {
    basePoints: input.basePoints,
    bonusPoints,
    awardedPoints,
    possiblePoints: input.possiblePoints,
    effectivePoints,
    scorePercent,
    wasCapped: awardedPoints > input.possiblePoints,
    bonusReason,
  };
}

export function boundPercentage(value: number): number {
  assertFinite('Percentage', value);
  return Math.min(100, Math.max(0, value));
}

/**
 * Converts stored score evidence into the additive API contract. Legacy rows
 * without point evidence remain readable, but their compatibility percentage
 * is still bounded before it leaves the backend.
 */
export function buildAcademicScoreContract(
  evidence: StoredAcademicScoreEvidence,
  options: { visible?: boolean } = {},
): AcademicScoreContract {
  if (options.visible === false) {
    return { score: null, scorePercent: null, scoreBreakdown: null };
  }

  const storedScore = evidence.score;
  const scorePercent =
    typeof storedScore === 'number' && Number.isFinite(storedScore)
      ? boundPercentage(storedScore)
      : null;
  const hasPointEvidence =
    evidence.basePointsEarned !== null &&
    evidence.basePointsEarned !== undefined &&
    evidence.possiblePointsSnapshot !== null &&
    evidence.possiblePointsSnapshot !== undefined;
  if (!hasPointEvidence) {
    return { score: scorePercent, scorePercent, scoreBreakdown: null };
  }

  const basePoints = Number(evidence.basePointsEarned);
  const possiblePoints = Number(evidence.possiblePointsSnapshot);
  const bonusPoints = Number(evidence.bonusPoints ?? 0);

  if (
    !Number.isFinite(basePoints) ||
    !Number.isFinite(possiblePoints) ||
    !Number.isFinite(bonusPoints) ||
    possiblePoints <= 0
  ) {
    return { score: scorePercent, scorePercent, scoreBreakdown: null };
  }

  try {
    const scoreBreakdown = calculateBoundedScore({
      basePoints,
      possiblePoints,
      bonusPoints,
      bonusReason: evidence.bonusReason,
    });
    return {
      score: scoreBreakdown.scorePercent,
      scorePercent: scoreBreakdown.scorePercent,
      scoreBreakdown,
    };
  } catch {
    return { score: scorePercent, scorePercent, scoreBreakdown: null };
  }
}
