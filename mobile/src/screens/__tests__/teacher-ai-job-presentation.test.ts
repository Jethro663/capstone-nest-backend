import { getAiJobPresentation } from "../teacher-assessments/ai-job-presentation";

it("gives every AI job state a distinct accessible label and color", () => {
  const statuses = [
    "pending",
    "processing",
    "completed",
    "approved",
    "failed",
    "rejected",
    "cancelled",
  ] as const;
  const presentations = statuses.map(getAiJobPresentation);

  expect(presentations.map((entry) => entry.label)).toEqual([
    "Queued",
    "Processing",
    "Ready for review",
    "Approved",
    "Failed",
    "Rejected",
    "Cancelled",
  ]);
  expect(new Set(presentations.map((entry) => entry.color)).size).toBe(
    statuses.length,
  );
});
