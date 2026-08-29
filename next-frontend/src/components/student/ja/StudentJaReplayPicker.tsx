"use client";

import { AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";
import type { JaReviewAttemptSummary } from "@/types/ja";
import { cn } from "@/utils/cn";

interface StudentJaReplayPickerProps {
  attempts: JaReviewAttemptSummary[];
  disabled: boolean;
  onSelectAttempt: (attemptId: string) => void;
  onUnavailableAttempt?: () => void;
}

export function StudentJaReplayPicker({
  attempts,
  disabled,
  onSelectAttempt,
  onUnavailableAttempt,
}: StudentJaReplayPickerProps) {
  if (attempts.length === 0) {
    return (
      <p className="ja-inline-empty">
        No class assessments found. Take an assessment in your class to unlock
        JA Replay.
      </p>
    );
  }

  return (
    <div className="ja-review-attempts">
      {attempts.map((attempt) => {
        const isReplayed = Boolean(attempt.isReplayCompleted);
        const isClassSubmitted = Boolean(attempt.submittedAt && attempt.attemptId);

        return (
          <button
            key={attempt.attemptId || attempt.assessmentId}
            type="button"
            disabled={disabled}
            className={cn(
              "ja-assessment-card",
              isReplayed ? "is-complete" : "is-pending",
            )}
            onClick={() => {
              if (isClassSubmitted) onSelectAttempt(attempt.attemptId);
              else onUnavailableAttempt?.();
            }}
          >
            <span className="ja-assessment-card__main">
              <span
                className={cn(
                  "ja-assessment-card__icon",
                  isReplayed ? "is-complete" : "is-pending",
                )}
              >
                {isReplayed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </span>
              <span className="ja-assessment-card__copy">
                <strong>{attempt.assessmentTitle}</strong>
                <span>
                  {isReplayed
                    ? `Replay Score: ${attempt.replayScore ?? 100}% • Original Class Score: ${attempt.score ?? 0}%`
                    : attempt.score !== null
                      ? `Original Class Score: ${attempt.score}% • JA Replay Pending`
                      : "Not yet retaken in JA Replay"}
                </span>
              </span>
            </span>

            <span className="ja-assessment-card__actions">
              <span
                className={cn(
                  "ja-assessment-card__status",
                  isReplayed ? "is-complete" : "is-pending",
                )}
              >
                <span
                  className={cn(
                    "ja-assessment-card__dot",
                    isReplayed ? "is-complete" : "is-pending",
                  )}
                />
                {isReplayed
                  ? `Replay Score: ${attempt.replayScore ?? 100}%`
                  : "Not Retaken Yet"}
              </span>
              <span
                className={cn(
                  "ja-assessment-card__action",
                  isReplayed ? "is-complete" : "is-pending",
                )}
              >
                <PlayCircle className="h-4 w-4" />
                {isReplayed ? "View Replay Result" : "Start Replay"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
