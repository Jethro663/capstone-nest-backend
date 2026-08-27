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
    color: "#d97706",
    backgroundColor: "#2f220f",
    borderColor: "#7c4a12",
  },
  processing: {
    label: "Processing",
    color: "#60a5fa",
    backgroundColor: "#10243f",
    borderColor: "#28558a",
  },
  completed: {
    label: "Ready for review",
    color: "#a78bfa",
    backgroundColor: "#251c42",
    borderColor: "#5b4690",
  },
  approved: {
    label: "Approved",
    color: "#34d399",
    backgroundColor: "#102e25",
    borderColor: "#24664e",
  },
  failed: {
    label: "Failed",
    color: "#f87171",
    backgroundColor: "#371719",
    borderColor: "#7f3034",
  },
  rejected: {
    label: "Rejected",
    color: "#fb7185",
    backgroundColor: "#3a1721",
    borderColor: "#873548",
  },
  cancelled: {
    label: "Cancelled",
    color: "#94a3b8",
    backgroundColor: "#202733",
    borderColor: "#465267",
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
