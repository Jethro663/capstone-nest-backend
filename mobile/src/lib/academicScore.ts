import type { AcademicScoreBreakdown } from "../types/assessment";

export interface AcademicScoreSource {
  score?: number | null;
  scorePercent?: number | null;
  scoreBreakdown?: AcademicScoreBreakdown | null;
}

export function boundAcademicPercentage(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function presentAcademicScore(source: AcademicScoreSource) {
  const rawPercent = source.scorePercent ?? source.score ?? null;
  const scorePercent =
    rawPercent === null ? null : boundAcademicPercentage(rawPercent);
  const breakdown = source.scoreBreakdown ?? null;
  const pointsLabel = breakdown
    ? `${breakdown.effectivePoints}/${breakdown.possiblePoints}`
    : null;
  const percentageLabel =
    scorePercent === null ? "Pending" : `${Math.round(scorePercent)}%`;
  return {
    scorePercent,
    pointsLabel,
    percentageLabel,
    compactLabel: pointsLabel
      ? `${pointsLabel} · ${percentageLabel}`
      : percentageLabel,
    bonusLabel:
      breakdown && breakdown.bonusPoints > 0
        ? `+${breakdown.bonusPoints} bonus${breakdown.wasCapped ? " (capped at full credit)" : ""}${breakdown.bonusReason ? ` — ${breakdown.bonusReason}` : ""}`
        : null,
  };
}
