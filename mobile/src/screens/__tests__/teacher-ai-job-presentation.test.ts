import { getAiJobPresentation } from "../teacher-assessments/ai-job-presentation";
import { mobileBrand } from "../../theme/mobileBrand";

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
  expect(presentations.map((entry) => entry.color)).toEqual([
    mobileBrand.warning,
    mobileBrand.info,
    mobileBrand.navy,
    mobileBrand.success,
    mobileBrand.danger,
    mobileBrand.danger,
    mobileBrand.muted,
  ]);
  expect(presentations.every((entry) => entry.color !== entry.backgroundColor)).toBe(true);
});
