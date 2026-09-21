import { mobileBrand } from "../../theme/mobileBrand";
import type { AiGenerationStatus } from "../../types/ai";

export interface AiJobPresentation {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

const PRESENTATIONS: Record<string, AiJobPresentation> = {
  pending: {
    label: "Queued",
    color: mobileBrand.warning,
    backgroundColor: mobileBrand.warningSoft,
    borderColor: mobileBrand.warningBorder,
  },
  processing: {
    label: "Processing",
    color: mobileBrand.info,
    backgroundColor: mobileBrand.infoSoft,
    borderColor: mobileBrand.infoBorder,
  },
  completed: {
    label: "Ready for review",
    color: mobileBrand.navy,
    backgroundColor: mobileBrand.navySoft,
    borderColor: mobileBrand.infoBorder,
  },
  approved: {
    label: "Approved",
    color: mobileBrand.success,
    backgroundColor: mobileBrand.successSoft,
    borderColor: mobileBrand.successBorder,
  },
  failed: {
    label: "Failed",
    color: mobileBrand.danger,
    backgroundColor: mobileBrand.dangerSoft,
    borderColor: mobileBrand.dangerBorder,
  },
  rejected: {
    label: "Rejected",
    color: mobileBrand.danger,
    backgroundColor: mobileBrand.dangerSoft,
    borderColor: mobileBrand.dangerBorder,
  },
  cancelled: {
    label: "Cancelled",
    color: mobileBrand.muted,
    backgroundColor: mobileBrand.surfaceMuted,
    borderColor: mobileBrand.borderStrong,
  },
};

export function getAiJobPresentation(
  status: AiGenerationStatus | string,
): AiJobPresentation {
  const normalized = status === "queued"
    ? "pending"
    : status === "running"
      ? "processing"
      : status;
  return PRESENTATIONS[normalized] ?? PRESENTATIONS.processing;
}
