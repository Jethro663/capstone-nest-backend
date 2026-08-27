import type { Extraction, ExtractionReviewIssue } from "../../types/extraction";

export function nextExtractionReviewState(issues: ExtractionReviewIssue[]): string {
  return issues.some((issue) => issue.severity === "blocking" && !issue.resolved)
    ? "needs_review"
    : "ready";
}

export function getExtractionApplyBlocker(
  extraction: Extraction | null,
  options: { dirty: boolean; selectedSectionCount: number },
): string | null {
  if (!extraction || extraction.extractionStatus !== "completed" || extraction.isApplied) {
    return "Extraction must be completed and unapplied.";
  }
  if (options.dirty) return "Save extraction changes before applying.";
  if (options.selectedSectionCount === 0) return "Select at least one section to apply.";
  if (extraction.qualityGate === "fail") return "Extraction quality is too low to apply.";
  const issues = extraction.structuredContent?.audit?.reviewIssues ?? [];
  if (issues.some((issue) => issue.severity === "blocking" && !issue.resolved)) {
    return "Resolve blocking review issues before applying.";
  }
  if (extraction.reviewRequired) return "Teacher review is still required before apply.";
  return null;
}

export function getExtractionProvenanceLabel(metadata?: Record<string, unknown>): string {
  const provenance = metadata?.provenance;
  if (!provenance || typeof provenance !== "object") return "Source unavailable";
  const record = provenance as Record<string, unknown>;
  const pageStart = typeof record.pageStart === "number" ? record.pageStart : null;
  const pageEnd = typeof record.pageEnd === "number" ? record.pageEnd : pageStart;
  if (!pageStart) return "Source unavailable";
  return pageEnd && pageEnd !== pageStart ? `Pages ${pageStart}-${pageEnd}` : `Page ${pageStart}`;
}
